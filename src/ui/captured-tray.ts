import type { PieceColor, PieceSet, PieceType } from "../types";
import { createPieceNode, getPieceGlyph, type PieceKey } from "../chess/pieces";
import {
	TRAY_PIECE_ORDER,
	type CapturedTotals,
} from "../utils/captured-pieces";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface TrayArgs {
	/** Which side's captures we're showing — drives piece color and label. */
	color: PieceColor;
	totals: CapturedTotals;
	pieceSet: PieceSet;
	/**
	 * Material advantage from White's perspective. We only render an
	 * "+N" badge on the side that's actually ahead so it never duplicates.
	 */
	showAdvantage: boolean;
}

/**
 * Render a single captured-pieces tray (one of two — the other is the
 * opposite color shown above/below the board). Each row contains:
 *
 *   [piece] x N [piece] x N ... [+advantage]
 *
 * The pieces themselves are mini SVGs cloned from the active piece set so
 * the tray styles match the board. Pawns are listed first (lowest value)
 * up to queens, matching Lichess and chess.com conventions.
 */
export function renderCapturedTray(host: HTMLElement, args: TrayArgs): void {
	host.empty();
	host.classList.add("chess-study-captured");

	const counts =
		args.color === "w" ? args.totals.byWhite : args.totals.byBlack;

	// "Pieces captured by white" means *black* pieces — and vice versa.
	// The renderer below draws those former-opponent pieces.
	const drawColor: PieceColor = args.color === "w" ? "b" : "w";

	for (const type of TRAY_PIECE_ORDER) {
		const n = counts[type];
		if (n <= 0) continue;
		appendPieceGroup(host, drawColor, type, n, args.pieceSet);
	}

	if (args.showAdvantage && args.totals.advantage !== 0) {
		const adv = args.totals.advantage;
		// Show on whichever side is ahead.
		const showHere =
			(args.color === "w" && adv > 0) ||
			(args.color === "b" && adv < 0);
		if (showHere) {
			host.createSpan({
				cls: "chess-study-captured-adv",
				text: `+${Math.abs(adv)}`,
			});
		}
	}
}

/**
 * Append a group like "[♟️ ♟️ ♟️]" for `count` copies of one piece type.
 * Multiple copies overlap slightly to mirror the "stack" look from
 * Lichess so a 7-pawn capture doesn't take up half the row.
 */
function appendPieceGroup(
	host: HTMLElement,
	color: PieceColor,
	type: PieceType,
	count: number,
	pieceSet: PieceSet
): void {
	const group = host.createSpan({ cls: "chess-study-captured-group" });
	for (let i = 0; i < count; i++) {
		appendMiniPiece(group, color, type, pieceSet);
	}
}

function appendMiniPiece(
	host: HTMLElement,
	color: PieceColor,
	type: PieceType,
	pieceSet: PieceSet
): void {
	const key: PieceKey = `${color}${type}`;
	const wrap = host.createSpan({ cls: "chess-study-captured-piece" });

	if (pieceSet !== "unicode") {
		const node = createPieceNode(pieceSet, key);
		if (node) {
			const svg = document.createElementNS(SVG_NS, "svg");
			svg.setAttribute("viewBox", "0 0 45 45");
			svg.setAttribute("xmlns", SVG_NS);
			svg.classList.add("chess-study-captured-svg");
			svg.appendChild(node);
			wrap.appendChild(svg);
			return;
		}
	}

	wrap.classList.add("chess-study-captured-glyph");
	wrap.textContent = getPieceGlyph(key);
}
