import type { PositionStep } from "../chess/engine";
import type { PieceSet } from "../types";
import { createPieceNode, getPieceGlyph, type PieceKey } from "../chess/pieces";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface MoveListOptions {
	/** All position steps including index 0 (the start position). */
	steps: PositionStep[];
	/** Currently active step index (0 = start, 1 = after white's first move...). */
	activeIndex: number;
	/** Called when the user clicks a half-move; arg is the resulting step index. */
	onSelect: (stepIndex: number) => void;
	/** Active piece set for header king icons (matches the board). */
	pieceSet: PieceSet;
	/**
	 * Side to move for header emphasis. If omitted, derived from
	 * `steps[activeIndex]` FEN when available.
	 */
	activeTurn?: "w" | "b";
	/**
	 * When false, neither king header is outlined (e.g. finished free-board game).
	 * Default true.
	 */
	highlightHeaderTurn?: boolean;
}

/**
 * Render a clean two-column move list (white | black). Step 0 (the start
 * position) is *not* rendered here — it's reachable via the "Start position"
 * button under the board, which keeps the move list strictly about moves.
 */
export function renderMoveList(host: HTMLElement, opts: MoveListOptions): void {
	host.empty();
	host.classList.add("chess-study-moves");

	const moves = opts.steps.slice(1);

	const highlightHeader = opts.highlightHeaderTurn !== false;
	const turnToMove = highlightHeader
		? opts.activeTurn ??
			turnFromFen(
				opts.steps[clampActiveIndex(opts.activeIndex, opts.steps)]?.fen
			)
		: undefined;

	const table = host.createDiv({ cls: "chess-study-move-table" });
	const header = table.createDiv({ cls: "chess-study-move-row header" });
	header.createSpan({ cls: "chess-study-move-num", text: "#" });
	appendHeaderKingCell(
		header,
		opts.pieceSet,
		"wk",
		"White",
		turnToMove === "w"
	);
	appendHeaderKingCell(
		header,
		opts.pieceSet,
		"bk",
		"Black",
		turnToMove === "b"
	);

	if (moves.length === 0) {
		host.createDiv({
			cls: "chess-study-moves-empty",
			text: "No moves yet.",
		});
		return;
	}

	let i = 0;
	let moveNumber = 1;
	while (i < moves.length) {
		const row = table.createDiv({ cls: "chess-study-move-row" });
		row.createSpan({
			cls: "chess-study-move-num",
			text: String(moveNumber),
		});

		const whiteMove = moves[i];
		if (whiteMove) {
			renderCell(row, whiteMove.san ?? "", i + 1, opts);
			i += 1;
		} else {
			row.createSpan({ cls: "chess-study-move-cell empty" });
		}

		const blackMove = moves[i];
		if (blackMove) {
			renderCell(row, blackMove.san ?? "", i + 1, opts);
			i += 1;
		} else {
			row.createSpan({ cls: "chess-study-move-cell empty" });
		}

		moveNumber += 1;
	}
}

function renderCell(
	row: HTMLElement,
	san: string,
	stepIndex: number,
	opts: MoveListOptions
): void {
	const cell = row.createSpan({
		cls: "chess-study-move-cell",
		text: san,
	});
	cell.setAttribute("role", "button");
	cell.setAttribute("tabindex", "0");
	if (stepIndex === opts.activeIndex) cell.addClass("active");
	cell.addEventListener("click", () => opts.onSelect(stepIndex));
	cell.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			opts.onSelect(stepIndex);
		}
	});
}

function clampActiveIndex(activeIndex: number, steps: PositionStep[]): number {
	if (steps.length === 0) return 0;
	return Math.max(0, Math.min(activeIndex, steps.length - 1));
}

function turnFromFen(fen: string | undefined): "w" | "b" | undefined {
	if (!fen) return undefined;
	const side = fen.trim().split(/\s+/)[1];
	if (side === "w" || side === "b") return side;
	return undefined;
}

function appendHeaderKingCell(
	row: HTMLElement,
	pieceSet: PieceSet,
	key: Extract<PieceKey, "wk" | "bk">,
	label: string,
	isSideToMove: boolean
): void {
	const cell = row.createSpan({
		cls: `chess-study-move-cell header header-king${
			isSideToMove ? " header-king-to-move" : ""
		}`,
		attr: {
			"aria-label": label,
			title: isSideToMove ? `${label} to move` : label,
		},
	});
	if (pieceSet !== "unicode") {
		const node = createPieceNode(pieceSet, key);
		if (node) {
			const svg = document.createElementNS(SVG_NS, "svg");
			svg.setAttribute("viewBox", "0 0 45 45");
			svg.setAttribute("xmlns", SVG_NS);
			svg.classList.add("chess-study-move-header-king-svg");
			svg.setAttribute("aria-hidden", "true");
			svg.appendChild(node);
			cell.appendChild(svg);
			return;
		}
	}
	cell.createSpan({
		cls: "chess-study-move-header-king-glyph",
		text: getPieceGlyph(key),
		attr: { "aria-hidden": "true" },
	});
}
