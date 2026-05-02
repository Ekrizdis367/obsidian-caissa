import { requestUrl } from "obsidian";
import type { ExplorerSource } from "../types";
import { USER_AGENT } from "../utils/user-agent";

export interface ExplorerMove {
	san: string;
	uci: string;
	white: number;
	draws: number;
	black: number;
	total: number;
}

export interface ExplorerResult {
	totalGames: number;
	moves: ExplorerMove[];
	source: ExplorerSource;
	fen: string;
}

const ENDPOINTS: Record<ExplorerSource, string> = {
	masters: "https://explorer.lichess.ovh/masters",
	lichess: "https://explorer.lichess.ovh/lichess",
};

/**
 * Per-source LRU-ish cache of FEN -> result. Capped at 200 entries each so
 * a long study session never grows unbounded. Cache lives for the lifetime
 * of the plugin instance.
 */
const CACHE: Record<ExplorerSource, Map<string, ExplorerResult>> = {
	masters: new Map(),
	lichess: new Map(),
};
const MAX_CACHE = 200;

/** Tracks in-flight fetches so concurrent requesters dedupe to one network call. */
const PENDING: Record<ExplorerSource, Map<string, Promise<ExplorerResult>>> = {
	masters: new Map(),
	lichess: new Map(),
};

/**
 * Look up win/draw/loss statistics for a position from the Lichess Opening
 * Explorer. Cached in memory by FEN per source. Network errors throw — let
 * the caller decide how to surface them.
 *
 * As of March 2026 the Lichess Explorer API requires authentication. Pass
 * a personal access token (created at https://lichess.org/account/oauth/token)
 * as `apiToken`.
 */
export async function fetchExplorer(
	fen: string,
	source: ExplorerSource,
	apiToken: string
): Promise<ExplorerResult> {
	if (!apiToken) {
		throw new Error(
			"Add your Lichess API token in Caissa settings to use the explorer."
		);
	}

	const cached = CACHE[source].get(fen);
	if (cached) return cached;

	const inflight = PENDING[source].get(fen);
	if (inflight) return inflight;

	const promise = doFetch(fen, source, apiToken).finally(() => {
		PENDING[source].delete(fen);
	});
	PENDING[source].set(fen, promise);

	const result = await promise;
	rememberInCache(source, fen, result);
	return result;
}

async function doFetch(
	fen: string,
	source: ExplorerSource,
	apiToken: string
): Promise<ExplorerResult> {
	const url = `${ENDPOINTS[source]}?fen=${encodeURIComponent(fen)}&moves=20&topGames=0&recentGames=0`;
	const response = await requestUrl({
		url,
		method: "GET",
		throw: false,
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${apiToken}`,
			"User-Agent": USER_AGENT,
		},
	});

	if (response.status === 401 || response.status === 403) {
		throw new Error(
			"Lichess rejected your API token. Create a fresh one at lichess.org/account/oauth/token."
		);
	}

	if (response.status === 429) {
		throw new Error(
			"Lichess rate limit reached. Try again in a moment (limit is 25 requests per minute)."
		);
	}

	if (response.status < 200 || response.status >= 300) {
		throw new Error(
			`Lichess Explorer returned HTTP ${response.status}`
		);
	}

	const data = response.json as {
		white?: number;
		draws?: number;
		black?: number;
		moves?: Array<{
			uci?: string;
			san?: string;
			white?: number;
			draws?: number;
			black?: number;
		}>;
	};

	const totalGames =
		(data.white ?? 0) + (data.draws ?? 0) + (data.black ?? 0);

	const moves: ExplorerMove[] = (data.moves ?? [])
		.map((m) => {
			const white = m.white ?? 0;
			const draws = m.draws ?? 0;
			const black = m.black ?? 0;
			return {
				san: m.san ?? "",
				uci: m.uci ?? "",
				white,
				draws,
				black,
				total: white + draws + black,
			};
		})
		.filter((m) => m.san && m.total > 0);

	return { totalGames, moves, source, fen };
}

function rememberInCache(
	source: ExplorerSource,
	fen: string,
	result: ExplorerResult
): void {
	const map = CACHE[source];
	if (map.size >= MAX_CACHE) {
		const iterator = map.keys().next();
		if (!iterator.done) {
			map.delete(iterator.value);
		}
	}
	map.set(fen, result);
}

/** Clear all cached explorer results (used by tests or manual refresh). */
export function clearExplorerCache(): void {
	CACHE.masters.clear();
	CACHE.lichess.clear();
}
