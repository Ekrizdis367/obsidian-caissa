import type { Opening, OpeningVariation } from "../types";

/**
 * Build a Lichess opening-explorer URL for a space-separated SAN sequence
 * (same format as our `moves` fields). Strips simple move numbers if present.
 */
export function lichessExplorerUrlForMoves(moves: string): string {
	const cleaned = moves
		.replace(/\{[^}]*\}/g, " ")
		.replace(/\([^)]*\)/g, " ")
		.trim();
	const parts = cleaned
		.split(/\s+/)
		.map((t) => t.replace(/^\d+\.(?:\.\.)?/, "").trim())
		.filter(
			(t) =>
				t.length > 0 && !/^(1-0|0-1|1\/2-1\/2|\*)$/i.test(t)
		);
	const slug = parts.join("_");
	return `https://lichess.org/opening/${slug}`;
}

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
			"The Italian Game is a classical Open Game (1.e4 e5) where White develops the light-squared bishop to c4 early. The core idea is pressure against f7—often the softest square in Black’s camp at the start—while White keeps flexibility between sharp gambits (Evans, Fried Liver) and slower maneuvering lines (Giuoco Pianissimo).\n\n" +
			"White usually completes short castling, posts knights on f3/c3 or d2/f3, and competes for central squares, especially d5. Black challenges the Italian bishop with …Bc5 or …Nf6 systems, sometimes accepting temporary weaknesses in return for counterplay.\n\n" +
			"Choose this family when you want clear attacking motifs and straightforward development as White, or as Black to practice fundamental defense against 2.Nf3 setups.",
		variations: [
			{
				name: "Giuoco Piano",
				moves: "e4 e5 Nf3 Nc6 Bc4 Bc5",
				description:
					"The Giuoco Piano (“quiet game”) reaches the signature Italian structure after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5: both bishops eye the center and the f2/f7 diagonals, but neither side has tipped the pawn skeleton yet.\n\n" +
					"Play branches quickly—White can steer toward the Moller, the quiet d2–d3 systems, or sharper central breaks once development finishes. Black often challenges the Italian bishop with …Na5/…Nf6 ideas or prepares …d5 undermining e4.\n\n" +
					"Use this tab when you want the classic Open Italian battleground: sound, flexible, and a natural bridge toward either tactical or positional lines.",
			},
			{
				name: "Giuoco Pianissimo",
				moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 Nc3 d6",
				description:
					"The Giuoco Pianissimo is the deliberately slow Italian: after …Bc5, White plays d3 instead of an immediate central break. Knights go to f3/c3 (or similar), the center stays closed longer, and both sides finish development before committing to d2–d4 or …d5.\n\n" +
					"Typical plans include short castling, a kingside fianchetto (g2–g3, Bg2) for White, or prophylactic …a6/…Ba7 for Black to secure the c5 bishop. The middlegame rewards patience: small pawn moves (h3, a3, Re1) accumulate until one side can open lines favorably.\n\n" +
					"It is ideal when you want Italian ideas without the sharp Fried Liver or Evans tactics—rich maneuvering with fewer forced lines to memorize.",
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
			"The Ruy Lopez (Spanish) is one of chess’s oldest main-line weapons after 1.e4 e5 2.Nf3 Nc6: White develops 3.Bb5, immediately questioning Black’s knight that defends e5. The strategic goal is long-term pressure—often provoking …a6 and a bishop retreat—while White improves the rest of the army without releasing the tension too early.\n\n" +
			"Typical plans include rerouting the Spanish bishop to c2 or b3, reinforcing the center with d2–d4, and preparing kingside expansion. Black can steer toward closed, semi-open, or tactical structures (Berlin, Marshall, Open Spanish), so both sides need a sense of when to open the center.\n\n" +
			"It is an excellent repertoire choice when you like rich, maneuvering middlegames with a clear historical pedigree and deep theory if you want it.",
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
			"The Sicilian is Black’s most popular answer to 1.e4: instead of mirroring e5, Black stakes a claim on d4 from the flank with …c5. That creates an asymmetrical pawn skeleton where both sides can play for a win—Black often settles for a slightly cramped but dynamic structure in return for counter chances on the queenside and along half-open files.\n\n" +
			"White’s main attempts (Open Sicilian with d4, or anti-Sicilians like the Closed, Alapin, or Smith–Morra) define very different middlegames. Black’s choice of Najdorf, Dragon, Scheveningen, Sveshnikov, etc. decides which weaknesses are accepted and where counterplay arrives.\n\n" +
			"Study the Sicilian if you want combative, theory-rich positions where small move-order details matter but reward preparation with sharp initiative.",
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
			"The French begins 1.e4 e6, signalling that Black will challenge White’s central pawn chain with …d5 (often on move 2). The pawn structure that arises after exchanges or advances tends to be rigid but solid: Black accepts a bad light-squared bishop in many lines in exchange for a compact pawn front and clear plans on the queenside.\n\n" +
			"Major branches (Advance, Winawer, Classical, Tarrasch, Exchange) differ in how quickly the center opens and which side gets the bishop pair or open files. Black’s play often revolves around …c5/c4 breaks and pressure against d4; White tries to use extra space and faster development.\n\n" +
			"It suits players who like strategic tension, fewer early tactics than the Sicilian, and clear pawn-chain plans.",
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
			"The Caro-Kann prepares …d5 against 1.e4 with …c6 first, keeping the d-pawn protected so Black can recapture on d5 with a pawn if White exchanges. The hallmark is solidity: Black avoids many sharp gambits that target the e5-pawn in Open Games and aims for a sound structure where the light-squared bishop can develop outside the pawn chain (…Bf5 or …Bg4 systems).\n\n" +
			"White can choose sharp Panov attacks, space-gaining Advance lines, or quieter Exchange structures. Black’s counterplay is often slower but dependable—breaks with …c5 or …e5 appear once development catches up.\n\n" +
			"Pick the Caro-Kann when you want a respectable defense that emphasizes understanding over wild memorization.",
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
		description:
			"With 1…d5 Black immediately crosses White’s e4 center, often leading to early exchanges on d5. Compared to other defenses, the Scandinavian can steer the queen out early (…Qxd5 lines) or keep tension with …Nf6 recaptures, giving Black a choice between simplicity and slightly more subtle piece play.\n\n" +
			"The trade-off is development tempo—White gains time against the queen—but Black’s position remains fundamentally sound and easy to learn at club level.\n\n" +
			"It is a practical choice when you want forcing, concrete positions right out of move one.",
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
		description:
			"The Pirc (often reached via 1.e4 d6 2.d4 Nf6 3.Nc3 g6) is a hypermodern treatment: Black delays the classical e7–e5 or d7–d5 challenge and instead fianchettos the dark-squared bishop, inviting White to build a broad center that Black hopes to undermine later.\n\n" +
			"Typical plans include …Bg7, castling kingside, and breaks with …e5 or …c5 depending on White’s setup (Austrian Attack with f4, Classical lines, etc.). Black must respect White’s central space early on, then strike when the big pawns over-extend.\n\n" +
			"Choose the Pirc if you enjoy flexible pawn structures and counterpunching against large white centers.",
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
			"Alekhine’s Defense begins 1.e4 Nf6, immediately provoking 2.e5. Black’s knight retreats to d5, inviting White to build a big pawn center that Black intends to chip away at with …d6, …g6, …dxe5 ideas, or counter in the center once White over-extends.\n\n" +
			"Lines like the Four Pawns Attack are tactically sharp; calmer modern systems keep the game more positional. Black accepts some early awkwardness in return for dynamic imbalances.\n\n" +
			"It appeals to players who like provocation, piece activity, and turning white’s space into targets.",
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
			"The Queen’s Gambit starts 1.d4 d5 2.c4, offering a flank pawn to accelerate development and contest the center. Whether Black accepts (…dxc4) or declines with …e6, …c6, or counter-gambits, the resulting structures teach classic themes: minority attacks, hanging pawns, isolated d-pawns, and central breaks.\n\n" +
			"White often recovers the pawn while improving pieces; Black aims for either solid equality in the Slav/Semi-Slav or active counter in the Chigorin/Albin complexes.\n\n" +
			"It is ideal if you want deep, strategic d-pawn chess with a huge body of model games to study.",
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
			"The King’s Indian is a hypermodern king’s-fianchetto system against 1.d4/c4: Black allows White a spatial plus in the center, castles short quickly, and prepares …e5 or …c5 breaks against white’s extended pawn chain.\n\n" +
			"Classic lines feature opposite-side castling and racing attacks—White expands on the queenside while Black storms the kingside. Sämisch and Four Pawns setups increase White’s central tension; the Fianchetto variation is comparatively fluid.\n\n" +
			"Study the KID when you like rich attacking middlegames and are comfortable defending passively for a few moves before striking.",
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
		description:
			"The Nimzo-Indian arises after 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4, pinning the knight that controls e4 and d5. Black’s idea is to double or damage White’s pawn structure (…Bxc3+) in return for the bishop pair or long-term pressure against hanging pawns.\n\n" +
			"Rubinstein lines with e3 are quieter; Classical and Sämisch systems try to keep the tension or force clarifications on the queenside. Black must know when the pin is useful and when it merely helps White clarify the center.\n\n" +
			"It is one of the soundest ways to meet the queen’s pawn without committing to a King’s Indian structure.",
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
			"The Grünfeld features an early …d5 thrust against White’s big d4/c4 center after …g6 and …Bg7. Black often allows an isolated or hanging central structure in return for rapid development and piece activity aimed at white’s pawns.\n\n" +
			"Exchange and Russian main lines are heavily analyzed, but the core ideas—pressure on d4, queenside counterplay, and dynamic imbalances—repeat across variations.\n\n" +
			"Choose it when you want sharp, world-class theory with clear counterattacking themes as Black.",
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
		description:
			"The English (1.c4) is a flexible flank opening: White stakes out the d5 square from the wing and can transpose into reversed Sicilian structures, Hedgehog setups, or independent lines depending on Black’s reply.\n\n" +
			"Because move orders matter, both sides should understand typical pawn breaks (…e5, …d5, b2–b4 ideas for White) more than deep forcing tactics on move eight.\n\n" +
			"It suits players who like strategic variety and wish to steer away from main-line 1.d4 or 1.e4 theory trees while keeping fighting chances.",
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
		description:
			"The Réti begins 1.Nf3, postponing the central pawn tension and inviting transpositions to d4 lines, English structures, or reversed King’s Indian Attacks. White’s reward is flexibility; the cost is that Black can also steer the game toward comfortable equalizers if White plays too passively.\n\n" +
			"Typical ideas include a kingside fianchetto, pressure on d5, and fluid piece development before committing the pawn skeleton.\n\n" +
			"It is a strong choice when you want to outplay opponents positionally rather than bash out 25 moves of Najdorf theory.",
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
			"The London System (here 1.d4 d5 2.Nf3 Nf6 3.Bf4) is a system opening: White develops the dark-squared bishop outside the pawn chain before committing e2–e3 and a solid pawn triangle in the center. The goal is a reliable setup with minimal move-order stress—suitable for club players who want clear plans and fewer sharp gambits to memorize.\n\n" +
			"White often completes e3, Bd3, Nbd2 or Nc3, castles, and looks for c4 or central advances once Black’s structure declares itself. Black can challenge the bishop with …Ne4 ideas, play …c5 breaks, or head for Queen’s Indian-style development.\n\n" +
			"Reach for the London when you value solidity, straightforward development, and consistent middlegame ideas over forcing theoretical duels.",
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

