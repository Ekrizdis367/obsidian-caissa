import { App, FuzzySuggestModal } from "obsidian";
import {
	listWccMatches,
	listWccGamesForMatch,
	type WccMatchData,
	type WccGameData,
} from "../chess/wcc-games";

/**
 * Two-step WCC picker:
 *   1. {@link WccMatchPickerModal} — fuzzy-search by match (year + players).
 *   2. {@link WccGamePickerModal} — pick one of the bundled games for that match.
 */
export class WccMatchPickerModal extends FuzzySuggestModal<WccMatchData> {
	private readonly app_: App;
	private readonly onChoose: (game: WccGameData) => void;

	constructor(app: App, onChoose: (game: WccGameData) => void) {
		super(app);
		this.app_ = app;
		this.onChoose = onChoose;
		this.setPlaceholder("Search world championship matches");
	}

	getItems(): WccMatchData[] {
		return listWccMatches();
	}

	getItemText(item: WccMatchData): string {
		return item.matchLabel;
	}

	onChooseItem(item: WccMatchData): void {
		new WccGamePickerModal(this.app_, item, this.onChoose).open();
	}
}

class WccGamePickerModal extends FuzzySuggestModal<WccGameData> {
	private readonly match: WccMatchData;
	private readonly onChoose: (game: WccGameData) => void;

	constructor(
		app: App,
		match: WccMatchData,
		onChoose: (game: WccGameData) => void
	) {
		super(app);
		this.match = match;
		this.onChoose = onChoose;
		this.setPlaceholder(`Search games — ${match.matchLabel}`);
	}

	getItems(): WccGameData[] {
		return listWccGamesForMatch(this.match.matchSlug);
	}

	getItemText(item: WccGameData): string {
		const display = item.result === "1/2-1/2" ? "½-½" : item.result;
		return `Game ${item.gameNumber} — ${shortName(item.white)} vs ${shortName(item.black)} (${display})`;
	}

	onChooseItem(item: WccGameData): void {
		this.onChoose(item);
	}
}

function shortName(name: string): string {
	const trimmed = name.trim();
	const comma = trimmed.indexOf(",");
	return comma > 0 ? trimmed.slice(0, comma) : trimmed;
}
