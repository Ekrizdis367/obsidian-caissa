import { Chess } from "chess.js";
import {
	findOpening,
	lichessExplorerUrlForMoves,
	type OpeningLookupResult,
} from "./openings";
import { findEndgame } from "./endgames";
import { findWccGame } from "./wcc-games";
import type { PgnHeaders, PieceType } from "../types";

/** Prefer a non-empty variation blurb; fall back to the family opening text. */
export function pickOpeningDescription(
	lookup: OpeningLookupResult
): string | undefined {
	const fromVariation = lookup.variation?.description?.trim();
	if (fromVariation) return fromVariation;
	return lookup.opening.description?.trim();
}

export interface PositionStep {
	/** FEN string for this position. */
	fen: string;
	/** SAN move that produced this position (undefined for the starting position). */
	san?: string;
	/** Origin square (e.g. "e2"). */
	from?: string;
	/** Destination square (e.g. "e4"). */
	to?: string;
	/** Color that just moved (undefined for the starting position). */
	color?: "w" | "b";
	/** 1-based full-move number this move belongs to (1 for white's first move). */
	moveNumber?: number;
	/** Type of piece captured by this move, if any. Drives the captured-pieces tray. */
	captured?: PieceType;
	/** Type the moving pawn was promoted to, if any. Used for material balance. */
	promotion?: PieceType;
}

export interface BuildResult {
	steps: PositionStep[];
	resolvedTitle?: string;
	resolvedDescription?: string;
	/** Present when the block resolved opening metadata from the bundled library. */
	resolvedGuideUrl?: string;
	headers?: PgnHeaders;
	error?: string;
}

/**
 * Build a sequence of board positions from a code-block config.
 *
 * Resolution order (first match wins):
 *   1. full PGN string (`pgn`) — extracts headers, starting position, and moves
 *   2. WCC game slug (`wccgame`) — resolves to a bundled PGN
 *   3. endgame slug/name (`endgame`) — bundled FEN + optional move sequence
 *   4. starting FEN + explicit `moves` string
 *   5. opening + variation lookup
 *   6. starting FEN alone (just the position)
 *
 * Move strings can be plain SAN (`e4 c5 Nf3`) or PGN-ish with numbers
 * (`1. e4 c5 2. Nf3`) — both are tolerated.
 */
export function buildPositions(args: {
	opening?: string;
	variation?: string;
	endgame?: string;
	wccgame?: string;
	moves?: string;
	pgn?: string;
	fen?: string;
}): BuildResult {
	if (args.pgn?.trim()) {
		return buildFromPgn(args.pgn.trim());
	}

	if (args.wccgame?.trim()) {
		const game = findWccGame(args.wccgame);
		if (!game) {
			return {
				steps: [],
				error: `Unknown WCC game: "${args.wccgame}"`,
			};
		}
		return buildFromPgn(game.pgn);
	}

	if (args.endgame?.trim()) {
		const endgame = findEndgame(args.endgame);
		if (!endgame) {
			return {
				steps: [],
				error: `Unknown endgame: "${args.endgame}"`,
			};
		}
		const inner = buildPositions({
			fen: endgame.fen,
			moves: endgame.moves,
		});
		return {
			...inner,
			resolvedTitle: endgame.name,
			resolvedDescription: endgame.description,
			resolvedGuideUrl: undefined,
		};
	}

	const startFen = args.fen?.trim();
	let title: string | undefined;
	let description: string | undefined;
	let movesSource = args.moves?.trim();
	let openingLibraryLookup: OpeningLookupResult | null = null;

	if (!movesSource && (args.opening || args.variation)) {
		const lookup = findOpening(args.opening, args.variation);
		if (!lookup) {
			return {
				steps: [],
				error: args.opening
					? `Unknown opening: "${args.opening}"`
					: "Variation given without an opening",
			};
		}
		openingLibraryLookup = lookup;
		movesSource = lookup.moves;
		title = lookup.variation
			? `${lookup.opening.name} — ${lookup.variation.name}`
			: lookup.opening.name;
		description = pickOpeningDescription(lookup);
	} else if (args.opening) {
		const lookup = findOpening(args.opening, args.variation);
		if (lookup) {
			openingLibraryLookup = lookup;
			title = lookup.variation
				? `${lookup.opening.name} — ${lookup.variation.name}`
				: lookup.opening.name;
			description = pickOpeningDescription(lookup);
		}
	}

	const openingGuideUrl = (): string | undefined => {
		if (!openingLibraryLookup) return undefined;
		const moveLine =
			movesSource?.trim() || openingLibraryLookup.moves;
		return (
			openingLibraryLookup.variation?.guideUrl ??
			openingLibraryLookup.opening.guideUrl ??
			lichessExplorerUrlForMoves(moveLine)
		);
	};

	let chess: Chess;
	try {
		chess = startFen ? new Chess(startFen) : new Chess();
	} catch (e) {
		return {
			steps: [],
			error: `Invalid FEN: ${(e as Error).message}`,
			resolvedTitle: title,
			resolvedDescription: description,
			resolvedGuideUrl: openingGuideUrl(),
		};
	}

	const steps: PositionStep[] = [{ fen: chess.fen() }];

	if (!movesSource) {
		return {
			steps,
			resolvedTitle: title,
			resolvedDescription: description,
			resolvedGuideUrl: openingGuideUrl(),
		};
	}

	const tokens = tokenizeMoves(movesSource);
	for (const san of tokens) {
		try {
			const move = chess.move(san);
			steps.push({
				fen: chess.fen(),
				san: move.san,
				from: move.from,
				to: move.to,
				color: move.color,
				moveNumber: Math.floor((steps.length - 1) / 2) + 1,
				captured: move.captured as PieceType | undefined,
				promotion: move.promotion as PieceType | undefined,
			});
		} catch (e) {
			return {
				steps,
				error: `Illegal move "${san}": ${(e as Error).message}`,
				resolvedTitle: title,
				resolvedDescription: description,
				resolvedGuideUrl: openingGuideUrl(),
			};
		}
	}

	return {
		steps,
		resolvedTitle: title,
		resolvedDescription: description,
		resolvedGuideUrl: openingGuideUrl(),
	};
}

/**
 * Parse a full PGN (headers + moves + optional annotations) using chess.js,
 * then walk the resulting move history to produce per-step FENs. Variations,
 * comments (`{...}` and `;...`), and NAGs (`$1`) are dropped — we follow the
 * mainline only.
 */
function buildFromPgn(pgn: string): BuildResult {
	const headers = extractHeaders(pgn);
	const cleaned = stripAnnotations(pgn);

	const game = new Chess();
	try {
		game.loadPgn(cleaned, { strict: false });
	} catch (e) {
		return {
			steps: [],
			headers,
			resolvedTitle: titleFromHeaders(headers),
			resolvedDescription: descriptionFromHeaders(headers),
			error: `Could not parse PGN: ${(e as Error).message}`,
		};
	}

	const history = game.history({ verbose: true });
	const replay = headers.fen ? new Chess(headers.fen) : new Chess();
	const steps: PositionStep[] = [{ fen: replay.fen() }];

	for (const move of history) {
		try {
			const played = replay.move(move.san);
			steps.push({
				fen: replay.fen(),
				san: played.san,
				from: played.from,
				to: played.to,
				color: played.color,
				moveNumber: Math.floor((steps.length - 1) / 2) + 1,
				captured: played.captured as PieceType | undefined,
				promotion: played.promotion as PieceType | undefined,
			});
		} catch (e) {
			return {
				steps,
				headers,
				resolvedTitle: titleFromHeaders(headers),
				resolvedDescription: descriptionFromHeaders(headers),
				error: `Illegal move replaying PGN: ${(e as Error).message}`,
			};
		}
	}

	return {
		steps,
		headers,
		resolvedTitle: titleFromHeaders(headers),
		resolvedDescription: descriptionFromHeaders(headers),
	};
}

/** Pull `[Tag "value"]` pairs out of a PGN into our typed headers shape. */
function extractHeaders(pgn: string): PgnHeaders & { fen?: string } {
	const headers: PgnHeaders & { fen?: string } = {};
	const tagRe = /\[\s*([A-Za-z][A-Za-z0-9]*)\s+"((?:[^"\\]|\\.)*)"\s*\]/g;
	let match: RegExpExecArray | null;
	while ((match = tagRe.exec(pgn)) !== null) {
		const key = (match[1] ?? "").toLowerCase();
		const value = (match[2] ?? "").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
		switch (key) {
			case "event":
				headers.event = value;
				break;
			case "site":
				headers.site = value;
				break;
			case "date":
			case "utcdate":
				if (!headers.date) headers.date = value;
				break;
			case "round":
				headers.round = value;
				break;
			case "white":
				headers.white = value;
				break;
			case "black":
				headers.black = value;
				break;
			case "result":
				headers.result = value;
				break;
			case "whiteelo":
				headers.whiteElo = value;
				break;
			case "blackelo":
				headers.blackElo = value;
				break;
			case "whitetitle":
				headers.whiteTitle = value;
				break;
			case "blacktitle":
				headers.blackTitle = value;
				break;
			case "eco":
				headers.eco = value;
				break;
			case "opening":
				headers.openingName = value;
				break;
			case "timecontrol":
				headers.timeControl = value;
				break;
			case "termination":
				headers.termination = value;
				break;
			case "fen":
				headers.fen = value;
				break;
		}
	}
	return headers;
}

/**
 * Drop PGN comments, variations, NAGs, and clock/eval annotations so the
 * tokenizer (and chess.js's loadPgn) doesn't trip over them.
 */
function stripAnnotations(pgn: string): string {
	return pgn
		.replace(/\{[^}]*\}/g, " ")
		.replace(/;[^\n]*/g, " ")
		.replace(/\([^)]*\)/g, " ")
		.replace(/\$\d+/g, " ");
}

function titleFromHeaders(h: PgnHeaders): string | undefined {
	if (h.white && h.black) {
		return `${h.white} vs ${h.black}`;
	}
	return h.event;
}

function descriptionFromHeaders(h: PgnHeaders): string | undefined {
	const parts: string[] = [];
	if (h.event) parts.push(h.event);
	if (h.date) parts.push(h.date);
	if (h.openingName) parts.push(h.openingName);
	return parts.length ? parts.join(" · ") : undefined;
}

/**
 * Strip move numbers, comments, NAGs, and result markers from a move string,
 * leaving only SAN tokens.
 */
export function tokenizeMoves(input: string): string[] {
	const cleaned = input
		.replace(/\{[^}]*\}/g, " ")
		.replace(/\([^)]*\)/g, " ")
		.replace(/\$\d+/g, " ")
		.replace(/\b\d+\.(\.\.)?/g, " ")
		.replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/g, " ");
	return cleaned
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}
