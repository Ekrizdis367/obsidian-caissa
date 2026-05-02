/**
 * Public API over the auto-generated WCC game catalog
 * ({@link WCC_GAMES} / {@link WCC_MATCHES} from `wcc-data.generated.ts`).
 *
 * The picker UI uses {@link listWccMatches} / {@link listWccGamesForMatch};
 * the engine uses {@link findWccGame} to resolve a slug into a PGN.
 */

import {
	WCC_GAMES,
	WCC_MATCHES,
	type WccGameData,
	type WccMatchData,
} from "./wcc-data.generated";

export type { WccGameData, WccMatchData };

/** All matches that have at least one bundled game, sorted newest-first. */
export function listWccMatches(): WccMatchData[] {
	return [...WCC_MATCHES].sort((a, b) => b.matchYear - a.matchYear);
}

/** All bundled games for a given matchSlug, sorted by game number ascending. */
export function listWccGamesForMatch(matchSlug: string): WccGameData[] {
	return WCC_GAMES.filter((g) => g.matchSlug === matchSlug).sort(
		(a, b) => a.gameNumber - b.gameNumber
	);
}

/** Look up a single game by id (slug). Case-insensitive. */
export function findWccGame(idOrName: string | undefined): WccGameData | null {
	if (!idOrName) return null;
	const target = idOrName.trim().toLowerCase();
	return WCC_GAMES.find((g) => g.id.toLowerCase() === target) ?? null;
}
