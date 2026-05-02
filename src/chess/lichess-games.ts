import { requestUrl } from "obsidian";
import { USER_AGENT } from "../utils/user-agent";

const ENDPOINT = "https://lichess.org/game/export";
const ID_RE = /^[a-zA-Z0-9]{8,12}$/;

const CACHE = new Map<string, string>();
const PENDING = new Map<string, Promise<string>>();
const MAX_CACHE = 50;

/**
 * Fetch a single game's PGN from Lichess. Anonymous endpoint — no token
 * required (unlike the Opening Explorer). Cached in memory by game ID for
 * the lifetime of the plugin instance.
 *
 * Accepts either a bare game ID (`abcdefgh`) or a Lichess URL pointing at
 * the game (`https://lichess.org/abcdefgh`, with or without `/black`/`/white`
 * orientation suffix).
 */
export async function fetchLichessGame(idOrUrl: string): Promise<string> {
	const id = parseLichessId(idOrUrl);
	if (!id) {
		throw new Error(
			`Could not extract a Lichess game ID from "${idOrUrl}".`
		);
	}

	const cached = CACHE.get(id);
	if (cached) return cached;

	const inflight = PENDING.get(id);
	if (inflight) return inflight;

	const promise = doFetch(id).finally(() => {
		PENDING.delete(id);
	});
	PENDING.set(id, promise);

	const pgn = await promise;
	rememberInCache(id, pgn);
	return pgn;
}

async function doFetch(id: string): Promise<string> {
	const url = `${ENDPOINT}/${id}?clocks=false&evals=false&literate=false`;
	const response = await requestUrl({
		url,
		method: "GET",
		throw: false,
		headers: {
			Accept: "application/x-chess-pgn",
			"User-Agent": USER_AGENT,
		},
	});

	if (response.status === 404) {
		throw new Error(`Lichess game "${id}" not found.`);
	}
	if (response.status === 429) {
		throw new Error(
			"Lichess rate limit reached. Try again in a moment."
		);
	}
	if (response.status < 200 || response.status >= 300) {
		throw new Error(
			`Lichess returned HTTP ${response.status} fetching game ${id}.`
		);
	}

	const pgn = response.text.trim();
	if (!pgn) {
		throw new Error(`Empty PGN returned for game ${id}.`);
	}
	return pgn;
}

/**
 * Pull a Lichess game ID out of a URL or accept a bare ID. Lichess game IDs
 * are 8 alphanumeric chars; study chapter URLs use 12-char IDs which we also
 * accept (the export endpoint handles them).
 */
export function parseLichessId(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	if (ID_RE.test(trimmed)) return trimmed;

	const urlMatch =
		/^https?:\/\/(?:www\.)?lichess\.org\/(?:embed\/)?([a-zA-Z0-9]{8,12})/.exec(
			trimmed
		);
	if (urlMatch && urlMatch[1]) return urlMatch[1].slice(0, 8);
	return null;
}

function rememberInCache(id: string, pgn: string): void {
	if (CACHE.size >= MAX_CACHE) {
		const iterator = CACHE.keys().next();
		if (!iterator.done) CACHE.delete(iterator.value);
	}
	CACHE.set(id, pgn);
}

export function clearLichessGameCache(): void {
	CACHE.clear();
}
