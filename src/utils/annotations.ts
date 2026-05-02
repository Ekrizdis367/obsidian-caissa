/**
 * Parse declarative arrow and square-highlight annotations out of the
 * `arrows:` and `highlights:` keys in a chess code block.
 *
 * Token grammar (whitespace-separated):
 *
 *   arrow      := <from-square><to-square>(-<color>)?
 *   highlight  := <square>(-<color>)?
 *
 * Examples:
 *
 *   arrows: e2e4 g1f3 d2d4-blue
 *   highlights: d4 e4-red f5-yellow
 *
 * Colors may be a named preset (`green`, `red`, `yellow`, `blue`) or a
 * 3/6/8-character hex code without the leading `#` (so the `-` separator
 * stays unambiguous). Unknown colors fall back to green.
 *
 * Invalid tokens are silently dropped — annotations are a presentation
 * concern and should never break a board's render.
 */

export interface ArrowSpec {
	from: string;
	to: string;
	color: string;
}

export interface HighlightSpec {
	square: string;
	color: string;
}

const NAMED_COLORS: Record<string, string> = {
	green: "rgba(85, 153, 51, 0.85)",
	red: "rgba(204, 51, 51, 0.85)",
	yellow: "rgba(232, 197, 49, 0.85)",
	blue: "rgba(0, 110, 184, 0.85)",
};

const DEFAULT_COLOR = NAMED_COLORS["green"] ?? "rgba(85, 153, 51, 0.85)";

const HEX_RE = /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/;

export function parseArrows(value: string | undefined): ArrowSpec[] {
	if (!value) return [];
	const out: ArrowSpec[] = [];
	for (const tok of value.split(/\s+/)) {
		if (!tok) continue;
		const { squarePart, color } = splitColor(tok);
		if (squarePart.length !== 4) continue;
		const from = squarePart.slice(0, 2).toLowerCase();
		const to = squarePart.slice(2, 4).toLowerCase();
		if (!isAlgebraicSquare(from) || !isAlgebraicSquare(to)) continue;
		if (from === to) continue;
		out.push({ from, to, color });
	}
	return out;
}

export function parseHighlights(value: string | undefined): HighlightSpec[] {
	if (!value) return [];
	const out: HighlightSpec[] = [];
	for (const tok of value.split(/\s+/)) {
		if (!tok) continue;
		const { squarePart, color } = splitColor(tok);
		const sq = squarePart.toLowerCase();
		if (!isAlgebraicSquare(sq)) continue;
		out.push({ square: sq, color });
	}
	return out;
}

function splitColor(tok: string): { squarePart: string; color: string } {
	const dashIdx = tok.indexOf("-");
	if (dashIdx < 0) {
		return { squarePart: tok, color: DEFAULT_COLOR };
	}
	const squarePart = tok.slice(0, dashIdx);
	const rawColor = tok.slice(dashIdx + 1).toLowerCase();
	return { squarePart, color: resolveColor(rawColor) };
}

function resolveColor(name: string): string {
	const named = NAMED_COLORS[name];
	if (named) return named;
	if (HEX_RE.test(name)) return `#${name}`;
	return DEFAULT_COLOR;
}

function isAlgebraicSquare(sq: string): boolean {
	if (sq.length !== 2) return false;
	const file = sq.charCodeAt(0);
	const rank = sq.charCodeAt(1);
	return (
		file >= "a".charCodeAt(0) &&
		file <= "h".charCodeAt(0) &&
		rank >= "1".charCodeAt(0) &&
		rank <= "8".charCodeAt(0)
	);
}
