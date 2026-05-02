import type {
	ExplorerMove,
	ExplorerResult,
} from "../chess/explorer";
import type { ExplorerSource } from "../types";

export type LinesPanelState =
	| { kind: "idle" }
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "empty"; source: ExplorerSource }
	| {
			kind: "ready";
			result: ExplorerResult;
			fullMoveNumber: number;
			turn: "w" | "b";
			maxLines: number;
	  };

/**
 * Render the "Lines" panel — a list of candidate next moves with stacked
 * win/draw/loss percentage bars. Designed to be re-called whenever the
 * underlying state changes; it owns the contents of `host` and rebuilds
 * them in place.
 */
export function renderLinesPanel(
	host: HTMLElement,
	state: LinesPanelState
): void {
	host.empty();
	host.classList.add("chess-study-lines-panel");

	const header = host.createDiv({ cls: "chess-study-lines-header" });
	header.createSpan({ cls: "chess-study-lines-title", text: "Lines" });

	switch (state.kind) {
		case "idle":
			host.createDiv({
				cls: "chess-study-lines-status",
				text: "Opening explorer disabled.",
			});
			return;
		case "loading":
			host.createDiv({
				cls: "chess-study-lines-status",
				text: "Loading lines…",
			});
			return;
		case "error":
			host.createDiv({
				cls: "chess-study-lines-status error",
				text: `Could not load explorer: ${state.message}`,
			});
			return;
		case "empty":
			host.createDiv({
				cls: "chess-study-lines-status",
				text: `No ${state.source === "masters" ? "master" : "Lichess"} games at this position.`,
			});
			return;
		case "ready":
			renderReady(host, state);
			return;
	}
}

function renderReady(
	host: HTMLElement,
	state: Extract<LinesPanelState, { kind: "ready" }>
): void {
	const { result, fullMoveNumber, turn, maxLines } = state;

	const meta = host.createDiv({ cls: "chess-study-lines-meta" });
	meta.createSpan({
		text: `${formatGames(result.totalGames)} games · ${
			result.source === "masters" ? "Masters" : "Lichess"
		}`,
	});

	if (result.moves.length === 0) {
		host.createDiv({
			cls: "chess-study-lines-status",
			text: "No book moves at this position.",
		});
		return;
	}

	const table = host.createDiv({ cls: "chess-study-lines-table" });
	const moves = result.moves.slice(0, maxLines);

	for (const move of moves) {
		const row = table.createDiv({ cls: "chess-study-lines-row" });

		row.createSpan({
			cls: "chess-study-lines-label",
			text: formatMoveLabel(move.san, fullMoveNumber, turn),
		});

		buildBar(row, move);
	}
}

/**
 * Format the move label as standard PGN-ish notation:
 *   white to move on move 3 -> "3. Nc3"
 *   black to move on move 3 -> "3...c5"
 */
function formatMoveLabel(
	san: string,
	fullMoveNumber: number,
	turn: "w" | "b"
): string {
	return turn === "w"
		? `${fullMoveNumber}. ${san}`
		: `${fullMoveNumber}…${san}`;
}

function formatGames(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

function buildBar(row: HTMLElement, move: ExplorerMove): void {
	const bar = row.createDiv({ cls: "chess-study-lines-bar" });

	const total = move.total || 1;
	const whitePct = (move.white / total) * 100;
	const drawsPct = (move.draws / total) * 100;
	const blackPct = (move.black / total) * 100;

	makeSegment(bar, "white", whitePct);
	makeSegment(bar, "draws", drawsPct);
	makeSegment(bar, "black", blackPct);
}

function makeSegment(
	bar: HTMLElement,
	kind: "white" | "draws" | "black",
	pct: number
): void {
	const seg = bar.createDiv({
		cls: `chess-study-lines-seg seg-${kind}`,
	});
	seg.style.width = `${pct.toFixed(2)}%`;
	if (pct >= 8) {
		seg.createSpan({
			cls: "chess-study-lines-seg-label",
			text: `${formatPct(pct)}%`,
		});
	}
}

function formatPct(pct: number): string {
	if (pct >= 100) return "100";
	if (pct >= 10) return pct.toFixed(0);
	return pct.toFixed(1);
}

/**
 * Pull the full-move number and side-to-move out of a FEN string. Used by
 * the chess-block view to label candidate moves correctly.
 */
export function fenInfo(fen: string): { fullMoveNumber: number; turn: "w" | "b" } {
	const parts = fen.split(/\s+/);
	const turn = (parts[1] ?? "w") === "b" ? "b" : "w";
	const fullMoveNumber = parseInt(parts[5] ?? "1", 10) || 1;
	return { fullMoveNumber, turn };
}
