import { App, Modal } from "obsidian";
import type { PieceColor, PieceType } from "../types";
import { createPieceNode, getPieceGlyph, type PieceKey } from "../chess/pieces";

const SVG_NS = "http://www.w3.org/2000/svg";
const PROMOTION_PIECES: PieceType[] = ["q", "r", "b", "n"];

/**
 * Modal that shows the four promotion choices (Queen, Rook, Bishop, Knight)
 * as clickable piece glyphs. Closing the modal without picking is treated
 * as "cancel" — the caller abandons the move so the user can pick a
 * different from-square.
 *
 * Designed to feel similar to the Lichess promotion popover: pieces are
 * laid out left-to-right in descending value, and each is a big easy-to-tap
 * target so it works on touch.
 */
export class PromotionPickerModal extends Modal {
	private color: PieceColor;
	private onPick: (piece: PieceType | null) => void;
	private resolved = false;

	constructor(
		app: App,
		color: PieceColor,
		onPick: (piece: PieceType | null) => void
	) {
		super(app);
		this.color = color;
		this.onPick = onPick;
	}

	onOpen(): void {
		this.modalEl.addClass("chess-study-promotion-modal");
		this.contentEl.empty();
		this.contentEl.createEl("h3", { text: "Promote to" });

		const row = this.contentEl.createDiv({
			cls: "chess-study-promotion-row",
		});
		for (const type of PROMOTION_PIECES) {
			const btn = row.createEl("button", {
				cls: "chess-study-promotion-choice",
				attr: { type: "button", "aria-label": pieceLabel(type) },
			});
			renderChoiceGlyph(btn, this.color, type);
			btn.addEventListener("click", () => {
				this.resolved = true;
				this.onPick(type);
				this.close();
			});
		}
	}

	onClose(): void {
		if (!this.resolved) {
			this.onPick(null);
		}
	}
}

function renderChoiceGlyph(
	host: HTMLElement,
	color: PieceColor,
	type: PieceType
): void {
	const key: PieceKey = `${color}${type}`;
	const node = createPieceNode("cburnett", key);
	if (node) {
		const svg = document.createElementNS(SVG_NS, "svg");
		svg.setAttribute("viewBox", "0 0 45 45");
		svg.setAttribute("xmlns", SVG_NS);
		svg.classList.add("chess-study-promotion-svg");
		svg.appendChild(node);
		host.appendChild(svg);
		return;
	}
	host.textContent = getPieceGlyph(key);
}

function pieceLabel(type: PieceType): string {
	switch (type) {
		case "q":
			return "Queen";
		case "r":
			return "Rook";
		case "b":
			return "Bishop";
		case "n":
			return "Knight";
		default:
			return "Piece";
	}
}
