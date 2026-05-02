import type { PieceSet } from "../types";
import type { PieceKey } from "./pieces-types";
import { PIECE_SETS, type PieceSetData } from "./piece-data.generated";

export type { PieceKey } from "./pieces-types";

const UNICODE: Record<PieceKey, string> = {
	wk: "\u2654",
	wq: "\u2655",
	wr: "\u2656",
	wb: "\u2657",
	wn: "\u2658",
	wp: "\u2659",
	bk: "\u265A",
	bq: "\u265B",
	br: "\u265C",
	bb: "\u265D",
	bn: "\u265E",
	bp: "\u265F",
};

/**
 * Inline SVGs based on the cburnett set (public domain, by Colin M.L. Burnett).
 * Each glyph is drawn inside a 45x45 viewBox; the board renderer scales them
 * to fit a square. Stroke/fill colors are baked in so theming the squares
 * doesn't bleed onto the pieces.
 */
const CBURNETT: Record<PieceKey, string> = {
	wk: `<g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g>`,
	wq: `<g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/><circle cx="6" cy="12" r="2"/><circle cx="14" cy="9" r="2"/><circle cx="22.5" cy="8" r="2"/><circle cx="31" cy="9" r="2"/><circle cx="39" cy="12" r="2"/></g>`,
	wr: `<g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none" stroke-linejoin="miter"/></g>`,
	wb: `<g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/></g>`,
	wn: `<g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zM15 15.5a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000" stroke="#000"/></g>`,
	wp: `<path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>`,
	bk: `<g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#000"/><path d="M20 8h5" stroke-linejoin="miter"/><path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff"/></g>`,
	bq: `<g fill="#000" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke-linecap="butt"/><path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none" stroke="#fff"/></g>`,
	br: `<g fill="#000" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" stroke-linecap="butt"/><path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" stroke-linecap="butt"/><path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="miter"/></g>`,
	bb: `<g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#fff" stroke-linejoin="miter"/></g>`,
	bn: `<g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#000"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zM15 15.5a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#fff" stroke="#fff"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#fff" stroke="none"/></g>`,
	bp: `<path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>`,
};

const CBURNETT_DATA: PieceSetData = {
	license: "Public domain (Colin M.L. Burnett)",
	vbX: 0,
	vbY: 0,
	vbW: 45,
	vbH: 45,
	pieces: CBURNETT,
};

/**
 * The "letter" set isn't fetched from Lichess; it's just SVG <text> glyphs
 * with the standard chess piece initials (K Q R B N P), filled white or
 * black. Total bundle cost: ~600 bytes for the entire set.
 */
const LETTER_GLYPHS: Record<PieceKey, string> = {
	wk: "K",
	wq: "Q",
	wr: "R",
	wb: "B",
	wn: "N",
	wp: "P",
	bk: "K",
	bq: "Q",
	br: "R",
	bb: "B",
	bn: "N",
	bp: "P",
};

function buildLetterPiece(color: "w" | "b", letter: string): string {
	const fill = color === "w" ? "#fafafa" : "#1a1a1a";
	const stroke = color === "w" ? "#1a1a1a" : "#fafafa";
	return (
		`<text x="22.5" y="32" text-anchor="middle" font-size="28" ` +
		`font-family="Georgia, 'Times New Roman', serif" font-weight="700" ` +
		`fill="${fill}" stroke="${stroke}" stroke-width="0.6">${letter}</text>`
	);
}

const LETTER_DATA: PieceSetData = {
	license: "Synthesized in this plugin",
	vbX: 0,
	vbY: 0,
	vbW: 45,
	vbH: 45,
	pieces: {
		wk: buildLetterPiece("w", LETTER_GLYPHS.wk),
		wq: buildLetterPiece("w", LETTER_GLYPHS.wq),
		wr: buildLetterPiece("w", LETTER_GLYPHS.wr),
		wb: buildLetterPiece("w", LETTER_GLYPHS.wb),
		wn: buildLetterPiece("w", LETTER_GLYPHS.wn),
		wp: buildLetterPiece("w", LETTER_GLYPHS.wp),
		bk: buildLetterPiece("b", LETTER_GLYPHS.bk),
		bq: buildLetterPiece("b", LETTER_GLYPHS.bq),
		br: buildLetterPiece("b", LETTER_GLYPHS.br),
		bb: buildLetterPiece("b", LETTER_GLYPHS.bb),
		bn: buildLetterPiece("b", LETTER_GLYPHS.bn),
		bp: buildLetterPiece("b", LETTER_GLYPHS.bp),
	},
};

/** Lookup table from PieceSet identifier to its raw inline-SVG data. */
const ALL_SET_DATA: Partial<Record<PieceSet, PieceSetData>> = {
	cburnett: CBURNETT_DATA,
	letter: LETTER_DATA,
	...PIECE_SETS,
};

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Cache of parsed (set, piece) -> <g> nodes. We parse each SVG fragment once
 * via DOMParser and then clone the result on every render to avoid both the
 * security risk of innerHTML and the parsing cost on every frame.
 */
const PARSED: Partial<Record<string, SVGGElement>> = {};

function cacheKey(set: PieceSet, key: PieceKey): string {
	return `${set}:${key}`;
}

function parseSvgFragment(set: PieceSet, key: PieceKey): SVGGElement | null {
	const data = ALL_SET_DATA[set];
	if (!data) return null;
	const inner = data.pieces[key];
	if (!inner) return null;

	const cached = PARSED[cacheKey(set, key)];
	if (cached) return cached;

	// Wrap in a real <svg> doc because DOMParser refuses bare fragments.
	const wrapper = `<svg xmlns="${SVG_NS}">${inner}</svg>`;
	const doc = new DOMParser().parseFromString(wrapper, "image/svg+xml");
	const svgEl = doc.documentElement;

	const g = document.createElementNS(SVG_NS, "g");
	while (svgEl.firstChild) {
		g.appendChild(svgEl.firstChild);
	}
	PARSED[cacheKey(set, key)] = g;
	return g;
}

/**
 * Returns a fresh `<g>` element containing the requested piece's SVG artwork
 * already wrapped in a transform that places it at (0, 0) inside a 45x45
 * viewport (the renderer then translates to the destination square).
 *
 * Different sets use different source viewBoxes — we apply a uniform scale
 * (and translate, for sets with a non-zero origin like pixel's `0 -0.5`) so
 * everything renders into the same 45x45 cell without distortion.
 *
 * Returns `null` for non-SVG sets (e.g. unicode), in which case the renderer
 * falls back to the Unicode-glyph code path.
 */
export function createPieceNode(set: PieceSet, key: PieceKey): SVGGElement | null {
	const data = ALL_SET_DATA[set];
	if (!data) return null;
	const inner = parseSvgFragment(set, key);
	if (!inner) return null;

	const cloned = inner.cloneNode(true) as SVGGElement;
	uniquifyIds(cloned);

	const scale = 45 / Math.max(data.vbW, data.vbH);
	const tx = -data.vbX * scale;
	const ty = -data.vbY * scale;

	if (scale === 1 && tx === 0 && ty === 0) {
		return cloned;
	}

	const wrapper = document.createElementNS(SVG_NS, "g");
	wrapper.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
	if (set === "pixel") {
		// Preserve pixel-art crispness — disable smoothing on the wrapper.
		wrapper.setAttribute("shape-rendering", "crispEdges");
		wrapper.setAttribute("image-rendering", "pixelated");
	}
	wrapper.appendChild(cloned);
	return wrapper;
}

let idCounter = 0;
const URL_REF_RE = /url\(#([^)]+)\)/g;

/**
 * Several Lichess piece sets define internal `<linearGradient id="a">` and
 * reference them via `fill="url(#a)"`. When we drop multiple pieces (each a
 * cloned subtree) into a single board <svg>, those duplicate IDs collide and
 * every reference resolves to whichever fragment came first.
 *
 * To keep gradients/clipPaths working per-piece we walk each cloned piece
 * and rewrite all `id` attributes to a globally-unique value, then patch
 * any matching `url(#…)` paint refs and `href`/`xlink:href` link refs to
 * point at the new IDs. This is a no-op for sets without internal IDs
 * (cburnett, staunty, pixel, letter, unicode), so we only pay the walk
 * cost for merida and caliente.
 */
function uniquifyIds(root: SVGGElement): void {
	const elementsWithId = root.querySelectorAll("[id]");
	if (elementsWithId.length === 0) return;

	const idMap = new Map<string, string>();
	for (let i = 0; i < elementsWithId.length; i++) {
		const el = elementsWithId.item(i);
		if (!el) continue;
		const oldId = el.getAttribute("id");
		if (!oldId) continue;
		const newId = `cs-${idCounter++}`;
		idMap.set(oldId, newId);
		el.setAttribute("id", newId);
	}
	if (idMap.size === 0) return;

	rewriteRefs(root, idMap);
}

function rewriteRefs(node: Element, idMap: Map<string, string>): void {
	for (let i = 0; i < node.attributes.length; i++) {
		const attr = node.attributes.item(i);
		if (!attr) continue;
		const value = attr.value;

		if (value.includes("url(#")) {
			const next = value.replace(URL_REF_RE, (match, oldId: string) => {
				const newId = idMap.get(oldId);
				return newId ? `url(#${newId})` : match;
			});
			if (next !== value) attr.value = next;
		}

		if ((attr.localName === "href") && value.startsWith("#")) {
			const newId = idMap.get(value.slice(1));
			if (newId) attr.value = `#${newId}`;
		}
	}
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children.item(i);
		if (child) rewriteRefs(child, idMap);
	}
}

/** Unicode glyph for a piece (used by the "unicode" piece set). */
export function getPieceGlyph(key: PieceKey): string {
	return UNICODE[key];
}

/** Returns license text for a given set, for credits/attribution UI. */
export function getPieceSetLicense(set: PieceSet): string | null {
	if (set === "unicode") return "System font";
	return ALL_SET_DATA[set]?.license ?? null;
}
