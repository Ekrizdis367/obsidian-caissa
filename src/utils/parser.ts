import {
	ALL_PIECE_SETS,
	type BoardSize,
	type ChessBlockConfig,
	type ExplorerSource,
	type Orientation,
	type PieceSet,
} from "../types";

const VALID_SIZES = new Set<BoardSize>(["small", "medium", "large", "full"]);
const VALID_PIECE_SETS = new Set<PieceSet>(ALL_PIECE_SETS);

/** All recognized config keys (lowercase). Used by the raw-PGN heuristic. */
const CONFIG_KEYS = new Set([
	"opening",
	"variation",
	"endgame",
	"wccgame",
	"wcc",
	"moves",
	"pgn",
	"lichess",
	"lichessgame",
	"fen",
	"orientation",
	"side",
	"pieces",
	"pieceset",
	"light",
	"lightcolor",
	"lightsquare",
	"dark",
	"darkcolor",
	"darksquare",
	"title",
	"name",
	"size",
	"boardsize",
	"showmoves",
	"movelist",
	"moveslist",
	"movespanel",
	"interactive",
	"controls",
	"coordinates",
	"coords",
	"explorer",
	"explorersource",
	"explorerdb",
	"source",
	"startmove",
	"step",
	"atmove",
	"arrows",
	"arrow",
	"highlights",
	"highlight",
	"squares",
	"captured",
	"capturedpieces",
	"materialbar",
	"analyze",
	"engine",
	"stockfish",
	"play",
	"vs",
	"vsstockfish",
	"level",
	"skill",
	"skilllevel",
	"strength",
]);

/**
 * Parse the body of a ```chess code block.
 *
 * Two styles are accepted:
 *
 *   1. Structured — lines of `key: value` (one per line). Lines starting with
 *      `#` or `//` are comments. Multi-word values are taken verbatim. Unknown
 *      keys are silently ignored. Keys are case-insensitive.
 *
 *   2. Raw PGN — if the body looks like a PGN (starts with `[Tag "value"]`
 *      headers, or contains a SAN move sequence with no `key: value` lines),
 *      it's treated as if the entire body were a `pgn:` value. This lets you
 *      paste a PGN copied from Lichess/chess.com/ChessBase directly.
 */
export function parseBlockConfig(source: string): ChessBlockConfig {
	const cfg: ChessBlockConfig = {};

	if (looksLikeRawPgn(source)) {
		cfg.pgn = source.trim();
		return cfg;
	}

	const lines = source.split(/\r?\n/);
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#") || line.startsWith("//")) continue;

		const colon = line.indexOf(":");
		if (colon === -1) continue;
		const key = line.slice(0, colon).trim().toLowerCase();
		const value = line.slice(colon + 1).trim();
		if (!value) continue;

		assignKey(cfg, key, value);
	}
	return cfg;
}

/**
 * Heuristic: a body is "raw PGN" if its first significant line is a PGN
 * tag pair (`[Event "..."]`), or if no line in the body matches our
 * `key: value` shape but at least one move-like token is present.
 */
function looksLikeRawPgn(source: string): boolean {
	const lines = source
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));

	if (lines.length === 0) return false;

	// Strong signal: first line is a PGN tag pair.
	if (/^\[[A-Za-z][A-Za-z0-9]*\s+"[^"]*"\s*\]\s*$/.test(lines[0] ?? "")) {
		return true;
	}

	// Weak signal: no `key: value` lines but body looks like SAN moves.
	const hasKeyValue = lines.some((l) => {
		const colon = l.indexOf(":");
		if (colon <= 0) return false;
		const key = l.slice(0, colon).trim().toLowerCase();
		// Recognized config keys count as "looks like structured config".
		return CONFIG_KEYS.has(key);
	});
	if (hasKeyValue) return false;

	const moveLikeToken = /\b(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8])/;
	return lines.some((l) => moveLikeToken.test(l));
}

function assignKey(cfg: ChessBlockConfig, key: string, value: string): void {
	switch (key) {
		case "opening":
			cfg.opening = value;
			return;
		case "variation":
			cfg.variation = value;
			return;
		case "endgame":
			cfg.endgame = value;
			return;
		case "wccgame":
		case "wcc":
			cfg.wccgame = value;
			return;
		case "moves":
			cfg.moves = value;
			return;
		case "pgn":
			cfg.pgn = value;
			return;
		case "lichess":
		case "lichessgame":
			cfg.lichess = value;
			return;
		case "fen":
			cfg.fen = value;
			return;
		case "orientation":
		case "side": {
			const lower = value.toLowerCase();
			if (lower === "white" || lower === "black") {
				cfg.orientation = lower as Orientation;
			}
			return;
		}
		case "pieces":
		case "pieceset": {
			const lower = value.toLowerCase() as PieceSet;
			if (VALID_PIECE_SETS.has(lower)) {
				cfg.pieces = lower;
			}
			return;
		}
		case "light":
		case "lightcolor":
		case "lightsquare":
			cfg.light = value;
			return;
		case "dark":
		case "darkcolor":
		case "darksquare":
			cfg.dark = value;
			return;
		case "title":
		case "name":
			cfg.title = value;
			return;
		case "size":
		case "boardsize": {
			const lower = value.toLowerCase() as BoardSize;
			if (VALID_SIZES.has(lower)) cfg.size = lower;
			return;
		}
		case "showmoves":
		case "movelist":
		case "moveslist":
		case "movespanel": {
			const bool = parseBool(value);
			if (bool !== null) cfg.showMoves = bool;
			return;
		}
		case "interactive":
		case "controls": {
			const bool = parseBool(value);
			if (bool !== null) cfg.interactive = bool;
			return;
		}
		case "coordinates":
		case "coords": {
			const bool = parseBool(value);
			if (bool !== null) cfg.coordinates = bool;
			return;
		}
		case "explorer": {
			const bool = parseBool(value);
			if (bool !== null) cfg.explorer = bool;
			return;
		}
		case "startmove":
		case "step":
		case "atmove": {
			const n = parseInt(value, 10);
			if (!isNaN(n)) cfg.startMove = n;
			return;
		}
		case "explorersource":
		case "explorerdb":
		case "source": {
			const lower = value.toLowerCase();
			if (lower === "masters" || lower === "lichess") {
				cfg.explorerSource = lower as ExplorerSource;
			}
			return;
		}
		case "arrows":
		case "arrow":
			cfg.arrows = value;
			return;
		case "highlights":
		case "highlight":
		case "squares":
			cfg.highlights = value;
			return;
		case "captured":
		case "capturedpieces":
		case "materialbar": {
			const bool = parseBool(value);
			if (bool !== null) cfg.captured = bool;
			return;
		}
		case "analyze":
		case "engine":
		case "stockfish": {
			const bool = parseBool(value);
			if (bool !== null) cfg.analyze = bool;
			return;
		}
		case "play":
		case "vs":
		case "vsstockfish": {
			const lower = value.toLowerCase();
			if (lower === "white" || lower === "black" || lower === "random") {
				cfg.play = lower;
			} else if (parseBool(lower) === true) {
				cfg.play = "white";
			}
			return;
		}
		case "level":
		case "skill":
		case "skilllevel":
		case "strength": {
			const n = parseInt(value, 10);
			if (!isNaN(n)) cfg.level = Math.max(0, Math.min(n, 20));
			return;
		}
	}
}

function parseBool(value: string): boolean | null {
	const v = value.toLowerCase();
	if (["true", "yes", "on", "1"].includes(v)) return true;
	if (["false", "no", "off", "0"].includes(v)) return false;
	return null;
}
