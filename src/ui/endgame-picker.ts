import { App, FuzzySuggestModal } from "obsidian";
import { ENDGAMES, type Endgame } from "../chess/endgames";

/**
 * Fuzzy-search modal for the curated endgame library. Single step — endgames
 * are flat, no sub-categories.
 */
export class EndgamePickerModal extends FuzzySuggestModal<Endgame> {
	private readonly onChoose: (endgame: Endgame) => void;

	constructor(app: App, onChoose: (endgame: Endgame) => void) {
		super(app);
		this.onChoose = onChoose;
		this.setPlaceholder("Search endgames");
	}

	getItems(): Endgame[] {
		return ENDGAMES;
	}

	getItemText(item: Endgame): string {
		return item.name;
	}

	onChooseItem(item: Endgame): void {
		this.onChoose(item);
	}
}
