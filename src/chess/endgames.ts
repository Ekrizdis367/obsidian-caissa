/**
 * Curated set of canonical endgame techniques. Each entry has:
 *   - a starting FEN (the textbook position)
 *   - an optional move sequence demonstrating the standard technique
 *   - a short description of the idea
 *
 * Move strings are SAN, fed straight into chess.js — keep them legal from the
 * given FEN. For positions where the technique is too branchy to teach via a
 * single line we leave `moves` undefined and let the user step around the
 * position freely (the opening explorer panel still works).
 */

export interface Endgame {
	/** Stable slug used in `endgame:` block keys. */
	id: string;
	name: string;
	fen: string;
	moves?: string;
	description: string;
}

export const ENDGAMES: Endgame[] = [
	{
		id: "kqk-mate",
		name: "King and queen mate",
		fen: "8/8/8/3k4/8/8/4Q3/4K3 w - - 0 1",
		moves: "Qd3+ Kc5 Kd2 Kc6 Kc3 Kb6 Qb5+ Ka7 Kc4 Ka8 Kc5 Ka7 Kc6 Ka8 Qb7#",
		description:
			"The queen mate technique: keep the queen one knight's-move from the lone king to shrink its box without stalemating, while your king walks up to support. The line shown drives Black's king from d5 to a8 over seven moves and finishes with Qb7# — the queen defended by your king on c6, every escape square covered. Black's defense in this demo is one plausible line; other king moves transpose into the same pattern.",
	},
	{
		id: "krk-mate",
		name: "King and rook mate",
		fen: "4k3/8/8/8/4K3/8/8/R7 w - - 0 1",
		moves: "Ra7 Kf8 Kf5 Kg8 Kg6 Kh8 Ra8#",
		description:
			"With king and rook the technique is the rook cutting off ranks while your king escorts the enemy toward an edge. The line shown plays 1.Ra7 to lock Black on the back rank, then walks the white king up via f5/g6 with shoulder-to-shoulder opposition, and finishes with Ra8# on the corner. Other defensive king moves lead to the same pattern.",
	},
	{
		id: "krrk-ladder-mate",
		name: "Two rooks ladder mate",
		fen: "4k3/8/8/8/8/8/R7/1R5K w - - 0 1",
		moves: "Rb7 Kd8 Ra8#",
		description:
			"The 'ladder': one rook cuts off the 7th rank, the other delivers mate on the 8th. 1.Rb7 forces the black king onto the back rank (Kd8 or Kf8 — both lose), and 2.Ra8# completes the staircase. Two rooks corner the king without any king help needed, which is why this mate is so quick.",
	},
	{
		id: "kbnk-mate",
		name: "Bishop and knight mate",
		fen: "8/2k5/8/1K6/5N2/8/5B2/8 w - - 0 84",
		moves:
			"Bc5 Kb7 Nd5 Kb8 Kc6 Ka8 Nc7+ Kb8 Bd4 Kc8 Ba7 Kd8 Nd5 Ke8 " +
			"Kd6 Kf7 Ne7 Kf6 Be3 Kf7 Bd4 Ke8 Ke6 Kd8 Bb6+ Ke8 Nf5 Kf8 " +
			"Bc7 Ke8 Ng7+ Kf8 Kf6 Kg8 Bd6 Kh7 Nf5 Kg8 Kg6 Kh8 Bc5 Kg8 " +
			"Nh6+ Kh8 Bd4#",
		description:
			"The hardest of the basic mates — KBNK can only be forced in the corner *matching your bishop's color*, and even then takes ~30 moves with the W-manoeuvre. The line shown is from **Karttunen vs Rasik, European Club Cup 2003**, picked up at move 84 with 23 moves left to mate. Watch the dark-squared bishop, knight and king herd Black across the back rank from the wrong corner (a8) all the way to the dark corner (h8), with knight checks at c7, e7, g7, f5 doing the W-pattern. The original game ended with Black resigning after 104.Bc5; this line plays out the forced finish 104…Kg8 105.Nh6+ Kh8 106.Bd4# that Rasik would have faced.",
	},
	{
		id: "kbbk-mate",
		name: "Two bishops mate",
		fen: "3B4/8/8/8/Bk6/8/8/7K w - - 0 1",
		moves:
			"Bc6 Kc5 Bb7 Kd6 Kg2 Kd7 Bb6 Kd6 Kf3 Ke5 Be4 Kd6 Kf4 Ke6 " +
			"Bc5 Kd7 Ke5 Kc7 Ke6 Kc8 Kd6 Kd8 Kc6 Ke8 Bd5 Kd8 Bf7 Kc8 " +
			"Be7 Kb8 Kb6 Kc8 Be6+ Kb8 Bd6+ Ka8 Bd5#",
		description:
			"The two bishops form a wall that herds the lone king to any corner — either color works (unlike B+N). The line shown is the **longest forced mate in KBBK (mate in 19)** from Joe Leslie-Hurd's 2005 tablebase analysis, with both sides playing perfectly. Watch the bishops centralize on b7+e4, the white king march from h1 → f4 → e6 → c6, and the final mating net snap shut on a8 with 19.Bd5#. Black's defense is optimal — every other reply mates faster.",
	},
	{
		id: "lucena",
		name: "Lucena position (winning the rook endgame)",
		fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1",
		description:
			"With your king in front of a 7th-rank pawn (not a- or h-file) and your rook free, build a 'bridge' on the 4th rank (Rc4!), then march your king out behind it. The defending rook eventually runs out of useful checks and the pawn promotes.",
	},
	{
		id: "philidor",
		name: "Philidor position (drawing the rook endgame)",
		fen: "3k4/8/8/4P3/4K3/7r/8/3R4 b - - 0 1",
		description:
			"As the defender, plant your rook on the third rank to keep the enemy king off the 6th. The instant the pawn pushes to e6, swing the rook behind the pawn (…Rh1) and check from the long side. Draw.",
	},
	{
		id: "vancura",
		name: "Vancura position (rook + a-pawn draw)",
		fen: "8/K7/P4r2/8/8/8/8/4k3 b - - 0 1",
		description:
			"Defender's rook attacks the a-pawn from the side along the 6th rank, the defender's king cuts the long side. The white king can never both shield the pawn and escape the side checks — drawn.",
	},
	{
		id: "kpk-opposition",
		name: "King and pawn vs king (opposition)",
		fen: "8/8/4K3/4P3/8/8/8/4k3 w - - 0 1",
		description:
			"With your king *in front of* the pawn on the 6th rank, you win by gaining the opposition (kings face off with one square between them, opponent to move). If the defender takes the opposition with the king on the key squares first, the position is drawn.",
	},
	{
		id: "wrong-bishop",
		name: "Wrong-colored bishop draw",
		fen: "7k/8/6KP/8/3B4/8/8/8 w - - 0 1",
		description:
			"With a rook-pawn whose promotion square does *not* match your bishop's color, the defender hides in the corner. Any approach by the strong side ends in stalemate (push the pawn here and the black king has no legal move). Memorise the corner colors before trading into this ending.",
	},
];

/** Find an endgame by id or display name (case- and punctuation-tolerant). */
export function findEndgame(idOrName: string | undefined): Endgame | null {
	if (!idOrName) return null;
	const target = normalize(idOrName);
	return (
		ENDGAMES.find(
			(e) => normalize(e.id) === target || normalize(e.name) === target
		) ?? null
	);
}

function normalize(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
