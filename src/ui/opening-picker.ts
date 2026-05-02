import { App, FuzzySuggestModal } from "obsidian";
import { OPENINGS } from "../chess/openings";
import type { Opening, OpeningVariation } from "../types";

/** Result of a completed pick: an opening, optionally narrowed to a variation. */
export interface OpeningPickResult {
	openingName: string;
	variationName?: string;
}

/**
 * Two-step opening picker:
 *   1. {@link OpeningPickerModal} — fuzzy-search the ~30 top-level openings.
 *   2. {@link VariationPickerModal} — if the chosen opening has variations,
 *      pick one (or "No variation — just the opening").
 *
 * Splitting the pick into two stages keeps each list short and lets users
 * find what they want even when they can't spell the exact name, since the
 * second list is filtered to variations of one specific opening.
 */
export class OpeningPickerModal extends FuzzySuggestModal<Opening> {
	private readonly app_: App;
	private readonly onChoose: (result: OpeningPickResult) => void;

	constructor(app: App, onChoose: (result: OpeningPickResult) => void) {
		super(app);
		this.app_ = app;
		this.onChoose = onChoose;
		this.setPlaceholder("Search openings");
	}

	getItems(): Opening[] {
		return OPENINGS;
	}

	getItemText(item: Opening): string {
		const aliases = item.aliases?.length
			? ` (${item.aliases.join(", ")})`
			: "";
		return `${item.name}${aliases}`;
	}

	onChooseItem(item: Opening): void {
		const variations = item.variations ?? [];
		if (variations.length === 0) {
			this.onChoose({ openingName: item.name });
			return;
		}
		new VariationPickerModal(this.app_, item, this.onChoose).open();
	}
}

interface VariationOption {
	/** Underlying variation, or undefined for the "no variation" sentinel. */
	variation?: OpeningVariation;
	displayName: string;
}

/**
 * Second step of the opening picker: shows variations for one opening, plus
 * a sentinel "No variation — just the opening" entry at the top.
 */
class VariationPickerModal extends FuzzySuggestModal<VariationOption> {
	private readonly opening: Opening;
	private readonly onChoose: (result: OpeningPickResult) => void;

	constructor(
		app: App,
		opening: Opening,
		onChoose: (result: OpeningPickResult) => void
	) {
		super(app);
		this.opening = opening;
		this.onChoose = onChoose;
		this.setPlaceholder(`Search variations of ${opening.name}`);
	}

	getItems(): VariationOption[] {
		const out: VariationOption[] = [
			{
				displayName: "No variation — just the opening",
			},
		];
		for (const v of this.opening.variations ?? []) {
			out.push({
				variation: v,
				displayName: v.name,
			});
		}
		return out;
	}

	getItemText(item: VariationOption): string {
		return item.displayName;
	}

	onChooseItem(item: VariationOption): void {
		if (!item.variation) {
			this.onChoose({ openingName: this.opening.name });
			return;
		}
		this.onChoose({
			openingName: this.opening.name,
			variationName: item.variation.name,
		});
	}
}
