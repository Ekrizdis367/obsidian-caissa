import type { Orientation, PieceColor, PieceSet, PieceType } from "../types";
import {
	createPieceNode,
	getPieceGlyph,
	type PieceKey,
} from "../chess/pieces";
import type { ArrowSpec, HighlightSpec } from "../utils/annotations";

const SVG_NS = "http://www.w3.org/2000/svg";
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SQUARE = 45;

export interface BoardOptions {
	fen: string;
	orientation: Orientation;
	pieceSet: PieceSet;
	lightColor: string;
	darkColor: string;
	highlightColor: string;
	coordinateColor: string;
	showCoordinates: boolean;
	from?: string;
	to?: string;
	/** Optional declarative arrow overlays drawn on top of the board. */
	arrows?: ArrowSpec[];
	/** Optional declarative square ring overlays drawn behind pieces. */
	highlights?: HighlightSpec[];
	/**
	 * When set, the board attaches transparent click targets per square and
	 * fires this callback with the clicked square (e.g. "e4"). Used by
	 * play-vs-engine mode and any future click-to-move features.
	 */
	onSquareClick?: (square: string) => void;
	/**
	 * Currently-selected source square, e.g. after the user picks up a
	 * piece. Rendered with a brighter ring than the static `highlights`.
	 */
	selectedSquare?: string;
	/**
	 * Squares that are legal destinations from {@link selectedSquare}.
	 * Empty squares get a small dot, capture squares get a larger ring
	 * (Lichess convention).
	 */
	legalTargets?: string[];
}

/**
 * Render (or re-render) a chess board into a host element. Tears down any
 * previous SVG inside the host and replaces it with a fresh one so it's safe
 * to call repeatedly when stepping through moves.
 */
export function renderBoard(host: HTMLElement, options: BoardOptions): void {
	host.empty();
	host.classList.add("chess-study-board-host");

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", "0 0 360 360");
	svg.setAttribute("xmlns", SVG_NS);
	svg.classList.add("chess-study-board");
	svg.setAttribute("role", "img");
	svg.setAttribute(
		"aria-label",
		`Chess position, ${options.orientation} to move from below`
	);

	const board = parseFen(options.fen);

	for (let r = 0; r < 8; r++) {
		for (let f = 0; f < 8; f++) {
			drawSquare(svg, r, f, options);
		}
	}

	if (options.from && options.to) {
		drawHighlight(svg, options.from, options.orientation, options.highlightColor);
		drawHighlight(svg, options.to, options.orientation, options.highlightColor);
	}

	// User-declared square highlights drawn behind pieces so the piece glyph
	// is still readable. We use a translucent ring rather than a fill so they
	// stand apart from the last-move highlight.
	if (options.highlights?.length) {
		for (const h of options.highlights) {
			drawSquareRing(svg, h.square, options.orientation, h.color);
		}
	}

	// Selection ring (only one at a time) sits behind the piece so the
	// glyph is still readable.
	if (options.selectedSquare) {
		drawSelectionRing(
			svg,
			options.selectedSquare,
			options.orientation
		);
	}

	if (options.showCoordinates) {
		drawCoordinates(svg, options);
	}

	for (let r = 0; r < 8; r++) {
		for (let f = 0; f < 8; f++) {
			const piece = board[r]?.[f];
			if (!piece) continue;
			drawPiece(svg, r, f, piece.color, piece.type, options);
		}
	}

	// Arrows draw last so they sit on top of pieces — that's the convention
	// users know from Lichess and chess.com analysis boards.
	if (options.arrows?.length) {
		for (const a of options.arrows) {
			drawArrow(svg, a.from, a.to, options.orientation, a.color);
		}
	}

	// Legal-move dots on top of pieces so the destination markers are
	// always visible (otherwise a target piece would hide its own ring).
	if (options.legalTargets?.length) {
		for (const sq of options.legalTargets) {
			const occupied = isOccupied(board, sq);
			drawLegalTarget(svg, sq, options.orientation, occupied);
		}
	}

	// Click-target overlays go on top of everything else so they get the
	// click events first. Pieces are drawn without pointer-events anyway,
	// but stacking them last is the simplest correct contract.
	if (options.onSquareClick) {
		const onClick = options.onSquareClick;
		for (let r = 0; r < 8; r++) {
			for (let f = 0; f < 8; f++) {
				attachClickTarget(svg, r, f, options.orientation, onClick);
			}
		}
		svg.classList.add("is-clickable");
	}

	host.appendChild(svg);
}

interface PieceCell {
	color: PieceColor;
	type: PieceType;
}

/** Returns an 8x8 array indexed [rank-from-top][file-from-left]. */
function parseFen(fen: string): (PieceCell | null)[][] {
	const board: (PieceCell | null)[][] = [];
	const placement = fen.split(" ")[0] ?? "";
	const ranks = placement.split("/");
	for (const rankStr of ranks) {
		const row: (PieceCell | null)[] = [];
		for (const ch of rankStr) {
			if (/[1-8]/.test(ch)) {
				const n = parseInt(ch, 10);
				for (let i = 0; i < n; i++) row.push(null);
			} else {
				const isWhite = ch === ch.toUpperCase();
				row.push({
					color: isWhite ? "w" : "b",
					type: ch.toLowerCase() as PieceType,
				});
			}
		}
		while (row.length < 8) row.push(null);
		board.push(row);
	}
	while (board.length < 8) board.push(new Array<PieceCell | null>(8).fill(null));
	return board;
}

/**
 * Convert (rank-from-top, file-from-left) into pixel (x, y) for the given
 * orientation. Each square is 45x45 inside a 360x360 viewBox.
 */
function squareToXY(
	r: number,
	f: number,
	orientation: Orientation
): { x: number; y: number } {
	if (orientation === "white") {
		return { x: f * 45, y: r * 45 };
	}
	return { x: (7 - f) * 45, y: (7 - r) * 45 };
}

/** Convert algebraic ("e4") into a (rank-from-top, file-from-left) pair. */
function algebraicToRC(square: string): { r: number; f: number } | null {
	if (square.length !== 2) return null;
	const file = square.charCodeAt(0) - "a".charCodeAt(0);
	const rank = parseInt(square[1] ?? "", 10);
	if (file < 0 || file > 7 || isNaN(rank) || rank < 1 || rank > 8) {
		return null;
	}
	return { r: 8 - rank, f: file };
}

function drawSquare(
	svg: SVGElement,
	r: number,
	f: number,
	opts: BoardOptions
): void {
	const { x, y } = squareToXY(r, f, opts.orientation);
	const isLight = (r + f) % 2 === 0;
	const rect = document.createElementNS(SVG_NS, "rect");
	rect.setAttribute("x", String(x));
	rect.setAttribute("y", String(y));
	rect.setAttribute("width", "45");
	rect.setAttribute("height", "45");
	rect.setAttribute(
		"fill",
		isLight ? opts.lightColor : opts.darkColor
	);
	svg.appendChild(rect);
}

function drawHighlight(
	svg: SVGElement,
	square: string,
	orientation: Orientation,
	color: string
): void {
	const rc = algebraicToRC(square);
	if (!rc) return;
	const { x, y } = squareToXY(rc.r, rc.f, orientation);
	const rect = document.createElementNS(SVG_NS, "rect");
	rect.setAttribute("x", String(x));
	rect.setAttribute("y", String(y));
	rect.setAttribute("width", String(SQUARE));
	rect.setAttribute("height", String(SQUARE));
	rect.setAttribute("fill", color);
	rect.setAttribute("pointer-events", "none");
	svg.appendChild(rect);
}

/**
 * Draw a selection ring around the picked-up piece. We use a yellow
 * translucent fill (so the underlying square color still shows through)
 * to match the convention from major chess sites.
 */
function drawSelectionRing(
	svg: SVGElement,
	square: string,
	orientation: Orientation
): void {
	const rc = algebraicToRC(square);
	if (!rc) return;
	const { x, y } = squareToXY(rc.r, rc.f, orientation);
	const rect = document.createElementNS(SVG_NS, "rect");
	rect.setAttribute("x", String(x));
	rect.setAttribute("y", String(y));
	rect.setAttribute("width", String(SQUARE));
	rect.setAttribute("height", String(SQUARE));
	rect.setAttribute("fill", "rgba(255, 230, 0, 0.45)");
	rect.setAttribute("pointer-events", "none");
	svg.appendChild(rect);
}

/**
 * Draw a small dot (empty square) or a hollow ring (capture square) on
 * a legal-move target. The ring sits at the square's edge so the piece
 * glyph underneath stays visible — matching Lichess.
 */
function drawLegalTarget(
	svg: SVGElement,
	square: string,
	orientation: Orientation,
	occupied: boolean
): void {
	const rc = algebraicToRC(square);
	if (!rc) return;
	const { x, y } = squareToXY(rc.r, rc.f, orientation);
	const cx = x + SQUARE / 2;
	const cy = y + SQUARE / 2;
	const circle = document.createElementNS(SVG_NS, "circle");
	circle.setAttribute("cx", String(cx));
	circle.setAttribute("cy", String(cy));
	if (occupied) {
		circle.setAttribute("r", String(SQUARE / 2 - 2));
		circle.setAttribute("fill", "none");
		circle.setAttribute("stroke", "rgba(0, 0, 0, 0.35)");
		circle.setAttribute("stroke-width", "4");
	} else {
		circle.setAttribute("r", String(SQUARE / 6));
		circle.setAttribute("fill", "rgba(0, 0, 0, 0.35)");
	}
	circle.setAttribute("pointer-events", "none");
	svg.appendChild(circle);
}

/**
 * Add an invisible per-square hit target on top of everything. Each
 * carries its algebraic name in `data-square` so the SVG-level click
 * handler can route the event without recomputing geometry.
 */
function attachClickTarget(
	svg: SVGElement,
	r: number,
	f: number,
	orientation: Orientation,
	onClick: (square: string) => void
): void {
	const { x, y } = squareToXY(r, f, orientation);
	const file = "abcdefgh".charAt(f);
	const rank = String(8 - r);
	const square = `${file}${rank}`;
	const rect = document.createElementNS(SVG_NS, "rect");
	rect.setAttribute("x", String(x));
	rect.setAttribute("y", String(y));
	rect.setAttribute("width", String(SQUARE));
	rect.setAttribute("height", String(SQUARE));
	rect.setAttribute("fill", "transparent");
	// Default SVG pointer-events is "visiblePainted" — a transparent fill
	// wouldn't capture clicks under that policy. Force "all" so the
	// invisible target still receives events and routes them.
	rect.setAttribute("pointer-events", "all");
	rect.classList.add("chess-study-board-target");
	rect.addEventListener("click", () => onClick(square));
	svg.appendChild(rect);
}

/**
 * Quick "is there a piece on this square?" check against the parsed FEN
 * grid. Used so legal-target rendering can pick "ring" vs "dot".
 */
function isOccupied(
	board: (PieceCell | null)[][],
	square: string
): boolean {
	const rc = algebraicToRC(square);
	if (!rc) return false;
	return board[rc.r]?.[rc.f] != null;
}

/**
 * Draw a translucent ring inside a square — used for user-declared
 * `highlights:` annotations. Inset slightly so the ring sits inside the
 * square edge instead of bleeding into neighbors.
 */
function drawSquareRing(
	svg: SVGElement,
	square: string,
	orientation: Orientation,
	color: string
): void {
	const rc = algebraicToRC(square);
	if (!rc) return;
	const { x, y } = squareToXY(rc.r, rc.f, orientation);
	const cx = x + SQUARE / 2;
	const cy = y + SQUARE / 2;
	const radius = SQUARE / 2 - 2;
	const circle = document.createElementNS(SVG_NS, "circle");
	circle.setAttribute("cx", String(cx));
	circle.setAttribute("cy", String(cy));
	circle.setAttribute("r", String(radius));
	circle.setAttribute("fill", "none");
	circle.setAttribute("stroke", color);
	circle.setAttribute("stroke-width", "3");
	circle.setAttribute("pointer-events", "none");
	svg.appendChild(circle);
}

/**
 * Draw a thick arrow from one square to another. The arrowhead is a
 * filled triangle whose base sits at the edge of the destination square,
 * and the shaft is shortened so the head sits cleanly on top of it
 * rather than poking past it.
 */
function drawArrow(
	svg: SVGElement,
	from: string,
	to: string,
	orientation: Orientation,
	color: string
): void {
	const fromRC = algebraicToRC(from);
	const toRC = algebraicToRC(to);
	if (!fromRC || !toRC) return;

	const fromXY = squareToXY(fromRC.r, fromRC.f, orientation);
	const toXY = squareToXY(toRC.r, toRC.f, orientation);

	const x1 = fromXY.x + SQUARE / 2;
	const y1 = fromXY.y + SQUARE / 2;
	const x2 = toXY.x + SQUARE / 2;
	const y2 = toXY.y + SQUARE / 2;

	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy);
	if (len < 1) return;

	const ux = dx / len;
	const uy = dy / len;

	const shaftWidth = 7;
	const headLen = 14;
	const headWidth = 16;

	// Shorten the shaft so the arrowhead's tip is the actual end-of-arrow,
	// and offset the start a touch so it doesn't sit dead-center on the
	// piece glyph.
	const startInset = 8;
	const endInset = headLen;
	const sx = x1 + ux * startInset;
	const sy = y1 + uy * startInset;
	const ex = x2 - ux * endInset;
	const ey = y2 - uy * endInset;

	const g = document.createElementNS(SVG_NS, "g");
	g.setAttribute("pointer-events", "none");

	const shaft = document.createElementNS(SVG_NS, "line");
	shaft.setAttribute("x1", String(sx));
	shaft.setAttribute("y1", String(sy));
	shaft.setAttribute("x2", String(ex));
	shaft.setAttribute("y2", String(ey));
	shaft.setAttribute("stroke", color);
	shaft.setAttribute("stroke-width", String(shaftWidth));
	shaft.setAttribute("stroke-linecap", "butt");
	g.appendChild(shaft);

	// Triangular head: tip at (x2,y2), base perpendicular to the shaft
	// `headLen` pixels back from the tip.
	const baseCx = x2 - ux * headLen;
	const baseCy = y2 - uy * headLen;
	const px = -uy;
	const py = ux;
	const baseAx = baseCx + px * (headWidth / 2);
	const baseAy = baseCy + py * (headWidth / 2);
	const baseBx = baseCx - px * (headWidth / 2);
	const baseBy = baseCy - py * (headWidth / 2);

	const head = document.createElementNS(SVG_NS, "polygon");
	head.setAttribute(
		"points",
		`${x2},${y2} ${baseAx},${baseAy} ${baseBx},${baseBy}`
	);
	head.setAttribute("fill", color);
	g.appendChild(head);

	svg.appendChild(g);
}

function drawCoordinates(svg: SVGElement, opts: BoardOptions): void {
	const orient = opts.orientation;
	for (let i = 0; i < 8; i++) {
		const fileChar = orient === "white" ? FILES[i] : FILES[7 - i];
		const rankChar = orient === "white" ? String(8 - i) : String(i + 1);

		const fileLabel = document.createElementNS(SVG_NS, "text");
		fileLabel.setAttribute("x", String(i * 45 + 38));
		fileLabel.setAttribute("y", "356");
		fileLabel.setAttribute("font-size", "8");
		fileLabel.setAttribute("font-family", "system-ui, sans-serif");
		fileLabel.setAttribute("font-weight", "600");
		fileLabel.setAttribute("fill", opts.coordinateColor);
		fileLabel.setAttribute("pointer-events", "none");
		fileLabel.textContent = fileChar ?? "";
		svg.appendChild(fileLabel);

		const rankLabel = document.createElementNS(SVG_NS, "text");
		rankLabel.setAttribute("x", "3");
		rankLabel.setAttribute("y", String(i * 45 + 11));
		rankLabel.setAttribute("font-size", "8");
		rankLabel.setAttribute("font-family", "system-ui, sans-serif");
		rankLabel.setAttribute("font-weight", "600");
		rankLabel.setAttribute("fill", opts.coordinateColor);
		rankLabel.setAttribute("pointer-events", "none");
		rankLabel.textContent = rankChar;
		svg.appendChild(rankLabel);
	}
}

function drawPiece(
	svg: SVGElement,
	r: number,
	f: number,
	color: PieceColor,
	type: PieceType,
	opts: BoardOptions
): void {
	const { x, y } = squareToXY(r, f, opts.orientation);
	const key: PieceKey = `${color}${type}`;

	if (opts.pieceSet !== "unicode") {
		const node = createPieceNode(opts.pieceSet, key);
		if (node) {
			// Wrap so we don't trample the per-set transform that
			// createPieceNode may have already applied (for sets whose
			// source viewBox differs from 45x45).
			const wrap = document.createElementNS(SVG_NS, "g");
			wrap.setAttribute("transform", `translate(${x}, ${y})`);
			wrap.appendChild(node);
			svg.appendChild(wrap);
			return;
		}
	}

	// Unicode fallback (or explicit unicode mode).
	const text = document.createElementNS(SVG_NS, "text");
	text.setAttribute("x", String(x + 22.5));
	text.setAttribute("y", String(y + 36));
	text.setAttribute("text-anchor", "middle");
	text.setAttribute("font-size", "38");
	text.setAttribute(
		"font-family",
		"'Segoe UI Symbol', 'Noto Sans Symbols 2', system-ui, sans-serif"
	);
	text.setAttribute("fill", color === "w" ? "#fafafa" : "#1a1a1a");
	text.setAttribute("stroke", color === "w" ? "#1a1a1a" : "#fafafa");
	text.setAttribute("stroke-width", "0.6");
	text.setAttribute("pointer-events", "none");
	text.textContent = getPieceGlyph(key);
	svg.appendChild(text);
}
