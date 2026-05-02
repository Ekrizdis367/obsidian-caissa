import type { PieceColor, PieceType } from "../types";

/** Composite key like "wk", "bp", etc. — used as the lookup key into all SVG sets. */
export type PieceKey = `${PieceColor}${PieceType}`;
