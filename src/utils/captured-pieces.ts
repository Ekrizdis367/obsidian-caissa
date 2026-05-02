import type { PieceType } from "../types";
import type { PositionStep } from "../chess/engine";

/**
 * Standard piece point values used to compute the material balance bar.
 * The king is intentionally excluded — kings are never captured and including
 * them would skew every position to a 0 balance.
 */
const PIECE_VALUE: Record<PieceType, number> = {
	p: 1,
	n: 3,
	b: 3,
	r: 5,
	q: 9,
	k: 0,
};

/** Display order from lowest to highest value, matching Lichess. */
export const TRAY_PIECE_ORDER: ReadonlyArray<PieceType> = [
	"p",
	"n",
	"b",
	"r",
	"q",
];

export interface CapturedTotals {
	/** Pieces captured by White (i.e. former Black pieces). */
	byWhite: Record<PieceType, number>;
	/** Pieces captured by Black (i.e. former White pieces). */
	byBlack: Record<PieceType, number>;
	/**
	 * Material advantage in pawn-equivalents from White's perspective.
	 * Positive = White is up material, negative = Black is up.
	 *
	 * This is computed from captures + promotions so it stays accurate
	 * even when the game starts from a non-standard FEN (we just measure
	 * delta from the starting position rather than from a 39-point assumption).
	 */
	advantage: number;
}

/**
 * Walk the steps array up to and including `untilIndex` to tally captured
 * pieces and material advantage.
 *
 * We use move history rather than naive FEN piece-counting because the latter
 * can't tell a captured queen apart from a promoted-and-then-traded queen.
 * Promotion bumps the promoting side's material by (promoted_value - 1) since
 * a pawn becomes the new piece.
 */
export function computeCaptured(
	steps: PositionStep[],
	untilIndex: number
): CapturedTotals {
	const byWhite: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
	const byBlack: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
	let advantage = 0;

	const stop = Math.min(untilIndex, steps.length - 1);
	// steps[0] is the starting position with no move; start at 1.
	for (let i = 1; i <= stop; i++) {
		const step = steps[i];
		if (!step) continue;

		if (step.captured) {
			const value = PIECE_VALUE[step.captured] ?? 0;
			if (step.color === "w") {
				byWhite[step.captured]++;
				advantage += value;
			} else if (step.color === "b") {
				byBlack[step.captured]++;
				advantage -= value;
			}
		}

		if (step.promotion) {
			const gain = (PIECE_VALUE[step.promotion] ?? 0) - PIECE_VALUE.p;
			if (step.color === "w") advantage += gain;
			else if (step.color === "b") advantage -= gain;
		}
	}

	return { byWhite, byBlack, advantage };
}

export function hasAnyCaptures(totals: CapturedTotals): boolean {
	if (totals.advantage !== 0) return true;
	for (const t of TRAY_PIECE_ORDER) {
		if (totals.byWhite[t] > 0) return true;
		if (totals.byBlack[t] > 0) return true;
	}
	return false;
}
