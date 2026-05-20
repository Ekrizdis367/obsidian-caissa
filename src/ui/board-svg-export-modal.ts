import { App, Modal, Notice } from "obsidian";

/**
 * Shows board SVG markup in a read-only textarea so the user can copy it
 * without the plugin touching the system clipboard.
 */
export class BoardSvgExportModal extends Modal {
	constructor(
		app: App,
		private readonly svgXml: string
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("chess-study-export-modal");
		this.titleEl.setText("Copy board vector markup");

		const { contentEl } = this;
		contentEl.createEl("p", {
			cls: "chess-study-export-modal-hint",
			text: "Select the SVG below and copy with your system shortcut, or save the board from the context menu.",
		});

		const preview = contentEl.createEl("textarea", {
			cls: "chess-study-export-modal-preview",
		});
		preview.value = this.svgXml;
		preview.readOnly = true;
		preview.rows = Math.min(
			24,
			Math.max(8, this.svgXml.split("\n").length + 1)
		);
		preview.spellcheck = false;

		const footer = contentEl.createDiv({ cls: "chess-study-export-modal-footer" });
		footer
			.createEl("button", {
				text: "Select all",
				attr: { type: "button" },
			})
			.addEventListener("click", () => {
				preview.focus();
				preview.select();
				new Notice("SVG selected — copy with your system shortcut.");
			});
		footer
			.createEl("button", { text: "Close", attr: { type: "button" } })
			.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
