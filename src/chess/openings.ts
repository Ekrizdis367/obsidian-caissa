import type { Opening, OpeningVariation } from "../types";

/**
 * Curated opening repertoire. Move strings are SAN (Standard Algebraic
 * Notation) without move numbers — they're fed straight into chess.js.
 *
 * Variation move strings begin from the standard start position too (i.e.
 * each variation is a complete move sequence, not a continuation), which
 * keeps lookup logic trivial.
 */
export const OPENINGS: Opening[] = [
	{
		name: "Italian Game",
		aliases: ["Italian"],
		moves: "e4 e5 Nf3 Nc6 Bc4",
		description:
			"Classical king-pawn opening; targets f7 and aims for quick development.",
		variations: [
			{
				name: "Giuoco Piano",
				moves: "e4 e5 Nf3 Nc6 Bc4 Bc5",
			},
			{
				name: "Giuoco Pianissimo",
				moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 Nc3 d6",
			},
			{
				name: "Evans Gambit",
				moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4",
			},
			{
				name: "Two Knights Defense",
				moves: "e4 e5 Nf3 Nc6 Bc4 Nf6",
			},
			{
				name: "Fried Liver Attack",
				moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7",
			},
		],
	},
	{
		name: "Ruy Lopez",
		aliases: ["Spanish", "Spanish Game"],
		moves: "e4 e5 Nf3 Nc6 Bb5",
		description:
			"One of the oldest and most respected openings; pressures the c6 knight.",
		variations: [
			{
				name: "Morphy Defense",
				moves: "e4 e5 Nf3 Nc6 Bb5 a6",
			},
			{
				name: "Berlin Defense",
				moves: "e4 e5 Nf3 Nc6 Bb5 Nf6",
			},
			{
				name: "Closed Variation",
				moves:
					"e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O",
			},
			{
				name: "Open Variation",
				moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4",
			},
			{
				name: "Exchange Variation",
				moves: "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6",
			},
			{
				name: "Marshall Attack",
				moves:
					"e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5",
			},
		],
	},
	{
		name: "Sicilian Defense",
		aliases: ["Sicilian"],
		moves: "e4 c5",
		description:
			"Black's most popular reply to 1.e4 — fights for the center asymmetrically.",
		variations: [
			{
				name: "Open Sicilian",
				moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3",
			},
			{
				name: "Najdorf Variation",
				moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6",
			},
			{
				name: "Dragon Variation",
				moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6",
			},
			{
				name: "Yugoslav Attack",
				moves:
					"e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6",
			},
			{
				name: "Accelerated Dragon",
				moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6",
			},
			{
				name: "Scheveningen Variation",
				moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6",
			},
			{
				name: "Sveshnikov Variation",
				moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5",
			},
			{
				name: "Taimanov Variation",
				moves: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6",
			},
			{
				name: "Kan Variation",
				moves: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6",
			},
			{
				name: "Classical Variation",
				moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6",
			},
			{
				name: "Closed Sicilian",
				moves: "e4 c5 Nc3",
			},
			{
				name: "Alapin Variation",
				moves: "e4 c5 c3",
			},
			{
				name: "Smith-Morra Gambit",
				moves: "e4 c5 d4 cxd4 c3",
			},
		],
	},
	{
		name: "French Defense",
		aliases: ["French"],
		moves: "e4 e6",
		description:
			"Solid and strategic; Black aims to undermine the e4 pawn with d5.",
		variations: [
			{
				name: "Advance Variation",
				moves: "e4 e6 d4 d5 e5",
			},
			{
				name: "Exchange Variation",
				moves: "e4 e6 d4 d5 exd5 exd5",
			},
			{
				name: "Tarrasch Variation",
				moves: "e4 e6 d4 d5 Nd2",
			},
			{
				name: "Classical Variation",
				moves: "e4 e6 d4 d5 Nc3 Nf6",
			},
			{
				name: "Winawer Variation",
				moves: "e4 e6 d4 d5 Nc3 Bb4",
			},
		],
	},
	{
		name: "Caro-Kann Defense",
		aliases: ["Caro-Kann", "Caro Kann"],
		moves: "e4 c6",
		description:
			"Reliable defense for Black; prepares d5 with a solid pawn structure.",
		variations: [
			{
				name: "Advance Variation",
				moves: "e4 c6 d4 d5 e5",
			},
			{
				name: "Exchange Variation",
				moves: "e4 c6 d4 d5 exd5 cxd5",
			},
			{
				name: "Classical Variation",
				moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5",
			},
			{
				name: "Panov-Botvinnik Attack",
				moves: "e4 c6 d4 d5 exd5 cxd5 c4",
			},
		],
	},
	{
		name: "Scandinavian Defense",
		aliases: ["Scandinavian", "Center-Counter"],
		moves: "e4 d5",
		description: "Black challenges the center immediately with 1...d5.",
		variations: [
			{
				name: "Main Line",
				moves: "e4 d5 exd5 Qxd5 Nc3 Qa5",
			},
			{
				name: "Modern Variation",
				moves: "e4 d5 exd5 Nf6",
			},
		],
	},
	{
		name: "Pirc Defense",
		aliases: ["Pirc"],
		moves: "e4 d6 d4 Nf6 Nc3 g6",
		description: "Hypermodern setup; Black fianchettos and counter-attacks.",
		variations: [
			{
				name: "Austrian Attack",
				moves: "e4 d6 d4 Nf6 Nc3 g6 f4",
			},
			{
				name: "Classical System",
				moves: "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2",
			},
		],
	},
	{
		name: "Alekhine's Defense",
		aliases: ["Alekhine"],
		moves: "e4 Nf6",
		description:
			"Provocative — invites White to push pawns and over-extend.",
		variations: [
			{
				name: "Modern Variation",
				moves: "e4 Nf6 e5 Nd5 d4 d6 Nf3",
			},
			{
				name: "Four Pawns Attack",
				moves: "e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4",
			},
		],
	},
	{
		name: "Queen's Gambit",
		aliases: ["QG"],
		moves: "d4 d5 c4",
		description:
			"Central pawn lever — White offers the c-pawn for control of the center.",
		variations: [
			{
				name: "Queen's Gambit Accepted",
				moves: "d4 d5 c4 dxc4",
			},
			{
				name: "Queen's Gambit Declined",
				moves: "d4 d5 c4 e6",
			},
			{
				name: "Slav Defense",
				moves: "d4 d5 c4 c6",
			},
			{
				name: "Semi-Slav Defense",
				moves: "d4 d5 c4 c6 Nc3 Nf6 Nf3 e6",
			},
			{
				name: "Tarrasch Defense",
				moves: "d4 d5 c4 e6 Nc3 c5",
			},
			{
				name: "Albin Counter-Gambit",
				moves: "d4 d5 c4 e5",
			},
		],
	},
	{
		name: "King's Indian Defense",
		aliases: ["KID", "Kings Indian"],
		moves: "d4 Nf6 c4 g6",
		description:
			"Hypermodern defense; Black allows a big center then strikes back.",
		variations: [
			{
				name: "Classical Variation",
				moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5",
			},
			{
				name: "Sämisch Variation",
				moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3",
			},
			{
				name: "Fianchetto Variation",
				moves: "d4 Nf6 c4 g6 Nc3 Bg7 g3",
			},
			{
				name: "Four Pawns Attack",
				moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4",
			},
		],
	},
	{
		name: "Nimzo-Indian Defense",
		aliases: ["Nimzo-Indian", "Nimzo Indian"],
		moves: "d4 Nf6 c4 e6 Nc3 Bb4",
		description: "Pin the c3 knight; one of the soundest defenses to 1.d4.",
		variations: [
			{
				name: "Rubinstein System",
				moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3",
			},
			{
				name: "Classical Variation",
				moves: "d4 Nf6 c4 e6 Nc3 Bb4 Qc2",
			},
			{
				name: "Sämisch Variation",
				moves: "d4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3",
			},
		],
	},
	{
		name: "Grünfeld Defense",
		aliases: ["Grunfeld"],
		moves: "d4 Nf6 c4 g6 Nc3 d5",
		description:
			"Hypermodern — Black challenges the center directly with d5.",
		variations: [
			{
				name: "Exchange Variation",
				moves: "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3",
			},
			{
				name: "Russian System",
				moves: "d4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3",
			},
		],
	},
	{
		name: "English Opening",
		aliases: ["English"],
		moves: "c4",
		description: "Flank opening; controls d5 from the side.",
		variations: [
			{
				name: "Symmetrical Variation",
				moves: "c4 c5",
			},
			{
				name: "Reversed Sicilian",
				moves: "c4 e5",
			},
			{
				name: "Anglo-Indian Defense",
				moves: "c4 Nf6",
			},
		],
	},
	{
		name: "Reti Opening",
		aliases: ["Réti"],
		moves: "Nf3",
		description: "Flexible flank opening; can transpose to many systems.",
		variations: [
			{
				name: "King's Indian Attack",
				moves: "Nf3 d5 g3",
			},
		],
	},
	{
		name: "London System",
		aliases: ["London"],
		moves: "d4 d5 Nf3 Nf6 Bf4",
		description:
			"Solid system for White; develop pieces to standard squares.",
	},
];

/** Normalize a name for fuzzy lookup. */
function normalize(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface OpeningLookupResult {
	opening: Opening;
	variation?: OpeningVariation;
	moves: string;
}

/**
 * Find an opening (and optional variation) by name. Case-insensitive,
 * tolerant of punctuation, accepts aliases. Returns the move sequence
 * to play out from the start position.
 */
export function findOpening(
	openingName: string | undefined,
	variationName?: string
): OpeningLookupResult | null {
	if (!openingName) {
		return null;
	}
	const target = normalize(openingName);
	const opening = OPENINGS.find((o) => {
		if (normalize(o.name) === target) return true;
		if (o.aliases?.some((a) => normalize(a) === target)) return true;
		return false;
	});
	if (!opening) {
		return null;
	}
	if (!variationName) {
		return { opening, moves: opening.moves };
	}
	const vTarget = normalize(variationName);
	const variation = opening.variations?.find(
		(v) => normalize(v.name) === vTarget
	);
	if (!variation) {
		return { opening, moves: opening.moves };
	}
	return { opening, variation, moves: variation.moves };
}

