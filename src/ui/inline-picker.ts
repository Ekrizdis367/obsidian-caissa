import { OPENINGS } from "../chess/openings";
import { ENDGAMES } from "../chess/endgames";
import { listWccMatches, listWccGamesForMatch } from "../chess/wcc-games";
import type { Opening, OpeningVariation } from "../types";

export interface InlinePickerOptions {
	/** Currently selected opening (case-insensitive, aliases honored). */
	currentOpening?: string;
	/** Currently selected variation, only meaningful with an opening. */
	currentVariation?: string;
	/** Currently selected endgame slug or display name. */
	currentEndgame?: string;
	/** Currently selected WCC game slug. */
	currentWccGame?: string;
	/** All inputs collapsed into a single update — the host applies it atomically. */
	onChange: (update: PickerUpdate) => void;
}

/**
 * What the picker emits whenever any dropdown changes. The host should:
 *   1. clear all category-specific keys it manages (opening/variation/endgame/wccgame)
 *   2. apply only the keys present in this update
 *
 * Empty string values mean "clear this key".
 */
export interface PickerUpdate {
	opening?: string;
	variation?: string;
	endgame?: string;
	wccgame?: string;
}

type Category = "openings" | "endgames" | "wcc";

const CATEGORY_PLACEHOLDER = "__category_placeholder__";
const PLACEHOLDER = "__placeholder__";
const NO_VARIATION = "__none__";

const CATEGORY_LABELS: Record<Category, string> = {
	openings: "Openings",
	endgames: "Endgames",
	wcc: "World Championship",
};

/**
 * Render the cascading category picker for blank chess blocks. The category
 * dropdown comes first; each category swaps in its own follow-up dropdowns.
 */
export function renderInlinePicker(
	host: HTMLElement,
	opts: InlinePickerOptions
): void {
	host.empty();
	host.classList.add("chess-study-inline-picker");

	const initialCategory = detectCategory(opts);

	const categoryRow = host.createDiv({ cls: "chess-study-inline-picker-row" });
	categoryRow.createSpan({
		cls: "chess-study-inline-picker-label",
		text: "Category",
	});
	const categorySelect = categoryRow.createEl("select", {
		cls: "chess-study-inline-picker-select",
	});
	categorySelect.createEl("option", {
		value: CATEGORY_PLACEHOLDER,
		text: "Pick a category…",
	});
	for (const id of Object.keys(CATEGORY_LABELS) as Category[]) {
		categorySelect.createEl("option", { value: id, text: CATEGORY_LABELS[id] });
	}
	categorySelect.value = initialCategory ?? CATEGORY_PLACEHOLDER;

	const subRows = host.createDiv({ cls: "chess-study-inline-picker-subrows" });
	const renderSub = (cat: Category | null) => {
		subRows.empty();
		if (cat === "openings") renderOpeningsSub(subRows, opts);
		else if (cat === "endgames") renderEndgamesSub(subRows, opts);
		else if (cat === "wcc") renderWccSub(subRows, opts);
	};
	renderSub(initialCategory);

	categorySelect.addEventListener("change", () => {
		const raw = categorySelect.value;
		if (raw === CATEGORY_PLACEHOLDER) {
			renderSub(null);
			opts.onChange({});
			return;
		}
		const cat = raw as Category;
		renderSub(cat);
		opts.onChange({});
	});
}

/* --- Sub-dropdowns ------------------------------------------------------- */

function renderOpeningsSub(host: HTMLElement, opts: InlinePickerOptions): void {
	const matchedOpening = findOpening(opts.currentOpening);

	const openingRow = host.createDiv({ cls: "chess-study-inline-picker-row" });
	openingRow.createSpan({
		cls: "chess-study-inline-picker-label",
		text: "Opening",
	});
	const openingSelect = openingRow.createEl("select", {
		cls: "chess-study-inline-picker-select",
	});
	openingSelect.createEl("option", {
		value: PLACEHOLDER,
		text: "Pick an opening…",
	});
	for (const o of OPENINGS) {
		openingSelect.createEl("option", { value: o.name, text: o.name });
	}
	openingSelect.value = matchedOpening?.name ?? PLACEHOLDER;
	openingSelect.addEventListener("change", () => {
		const v = openingSelect.value;
		opts.onChange({
			opening: v === PLACEHOLDER ? "" : v,
			variation: "",
		});
	});

	if (!matchedOpening || (matchedOpening.variations ?? []).length === 0) {
		return;
	}

	const variationRow = host.createDiv({ cls: "chess-study-inline-picker-row" });
	variationRow.createSpan({
		cls: "chess-study-inline-picker-label",
		text: "Variation",
	});
	const variationSelect = variationRow.createEl("select", {
		cls: "chess-study-inline-picker-select",
	});
	variationSelect.createEl("option", {
		value: NO_VARIATION,
		text: "Main line",
	});
	for (const v of matchedOpening.variations ?? []) {
		variationSelect.createEl("option", { value: v.name, text: v.name });
	}
	const matchedVariation = findVariation(matchedOpening, opts.currentVariation);
	variationSelect.value = matchedVariation?.name ?? NO_VARIATION;
	variationSelect.addEventListener("change", () => {
		const v = variationSelect.value;
		opts.onChange({
			opening: matchedOpening.name,
			variation: v === NO_VARIATION ? "" : v,
		});
	});
}

function renderEndgamesSub(host: HTMLElement, opts: InlinePickerOptions): void {
	const matched = findEndgameByIdOrName(opts.currentEndgame);

	const row = host.createDiv({ cls: "chess-study-inline-picker-row" });
	row.createSpan({
		cls: "chess-study-inline-picker-label",
		text: "Endgame",
	});
	const select = row.createEl("select", {
		cls: "chess-study-inline-picker-select",
	});
	select.createEl("option", {
		value: PLACEHOLDER,
		text: "Pick an endgame…",
	});
	for (const e of ENDGAMES) {
		select.createEl("option", { value: e.id, text: e.name });
	}
	select.value = matched ?? PLACEHOLDER;
	select.addEventListener("change", () => {
		const v = select.value;
		opts.onChange({
			endgame: v === PLACEHOLDER ? "" : v,
		});
	});
}

function renderWccSub(host: HTMLElement, opts: InlinePickerOptions): void {
	const matches = listWccMatches();
	const currentGame = opts.currentWccGame
		? findWccGameByIdLocal(opts.currentWccGame)
		: null;
	const initialMatchSlug = currentGame?.matchSlug;

	const matchRow = host.createDiv({ cls: "chess-study-inline-picker-row" });
	matchRow.createSpan({
		cls: "chess-study-inline-picker-label",
		text: "Match",
	});
	const matchSelect = matchRow.createEl("select", {
		cls: "chess-study-inline-picker-select",
	});
	matchSelect.createEl("option", {
		value: PLACEHOLDER,
		text: "Pick a match…",
	});
	for (const m of matches) {
		matchSelect.createEl("option", {
			value: m.matchSlug,
			text: m.matchLabel,
		});
	}
	matchSelect.value = initialMatchSlug ?? PLACEHOLDER;

	const gameRowWrap = host.createDiv({
		cls: "chess-study-inline-picker-gamerow-wrap",
	});

	const renderGameRow = (matchSlug: string | null) => {
		gameRowWrap.empty();
		if (!matchSlug) return;
		const games = listWccGamesForMatch(matchSlug);
		if (games.length === 0) return;

		const row = gameRowWrap.createDiv({
			cls: "chess-study-inline-picker-row",
		});
		row.createSpan({
			cls: "chess-study-inline-picker-label",
			text: "Game",
		});
		const select = row.createEl("select", {
			cls: "chess-study-inline-picker-select",
		});
		select.createEl("option", { value: PLACEHOLDER, text: "Pick a game…" });
		for (const g of games) {
			select.createEl("option", {
				value: g.id,
				text: gameLabel(g.gameNumber, g.white, g.black, g.result),
			});
		}
		select.value =
			currentGame && currentGame.matchSlug === matchSlug
				? currentGame.id
				: PLACEHOLDER;
		select.addEventListener("change", () => {
			const v = select.value;
			opts.onChange({
				wccgame: v === PLACEHOLDER ? "" : v,
			});
		});
	};

	renderGameRow(initialMatchSlug ?? null);

	matchSelect.addEventListener("change", () => {
		const v = matchSelect.value;
		if (v === PLACEHOLDER) {
			renderGameRow(null);
			opts.onChange({ wccgame: "" });
			return;
		}
		renderGameRow(v);
		opts.onChange({ wccgame: "" });
	});
}

/* --- Helpers ------------------------------------------------------------- */

function gameLabel(
	gameNumber: number,
	white: string,
	black: string,
	result: string
): string {
	const display = result === "1/2-1/2" ? "½-½" : result;
	return `Game ${gameNumber} — ${shortName(white)} vs ${shortName(black)} (${display})`;
}

/** Trim 'Lastname, Firstname' / 'Lastname,F' to just the family name. */
function shortName(name: string): string {
	const trimmed = name.trim();
	const comma = trimmed.indexOf(",");
	return comma > 0 ? trimmed.slice(0, comma) : trimmed;
}

function detectCategory(opts: InlinePickerOptions): Category | null {
	if (opts.currentEndgame) return "endgames";
	if (opts.currentWccGame) return "wcc";
	if (opts.currentOpening) return "openings";
	return null;
}

function normalize(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findOpening(name: string | undefined): Opening | null {
	if (!name) return null;
	const target = normalize(name);
	return (
		OPENINGS.find((o) => {
			if (normalize(o.name) === target) return true;
			return o.aliases?.some((a) => normalize(a) === target) ?? false;
		}) ?? null
	);
}

function findVariation(
	opening: Opening,
	name: string | undefined
): OpeningVariation | null {
	if (!name) return null;
	const target = normalize(name);
	return (
		(opening.variations ?? []).find((v) => normalize(v.name) === target) ??
		null
	);
}

function findEndgameByIdOrName(value: string | undefined): string | null {
	if (!value) return null;
	const target = normalize(value);
	const hit = ENDGAMES.find(
		(e) => normalize(e.id) === target || normalize(e.name) === target
	);
	return hit?.id ?? null;
}

/**
 * Local light lookup so we don't need to import the public WCC helper just
 * to find a single game (it would also pull all WCC data into this bundle
 * for callers that don't need it — though picker is the only caller for
 * now).
 */
function findWccGameByIdLocal(
	id: string
): { id: string; matchSlug: string } | null {
	const target = id.trim().toLowerCase();
	for (const m of listWccMatches()) {
		const games = listWccGamesForMatch(m.matchSlug);
		const hit = games.find((g) => g.id.toLowerCase() === target);
		if (hit) return { id: hit.id, matchSlug: hit.matchSlug };
	}
	return null;
}
