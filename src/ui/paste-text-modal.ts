import { App, Modal, Setting } from "obsidian";

export interface PasteTextModalOptions {
	title: string;
	description: string;
	placeholder: string;
	/** Initial textarea value (e.g. empty or a template). */
	initial?: string;
	rows?: number;
	submitLabel?: string;
}

/**
 * Modal that asks the user to paste text instead of reading the system clipboard.
 */
export class PasteTextModal extends Modal {
	constructor(
		app: App,
		private readonly opts: PasteTextModalOptions,
		private readonly onSubmit: (text: string) => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;
		titleEl.setText(this.opts.title);
		contentEl.createEl("p", {
			cls: "chess-study-paste-modal-hint",
			text: this.opts.description,
		});

		let value = this.opts.initial ?? "";
		new Setting(contentEl)
			.setClass("chess-study-paste-modal-field")
			.addTextArea((area) => {
				area
					.setPlaceholder(this.opts.placeholder)
					.setValue(value)
					.onChange((v) => {
						value = v;
					});
				const input = area.inputEl;
				input.rows = this.opts.rows ?? 6;
				input.spellcheck = false;
				input.addEventListener("keydown", (ev) => {
					if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
						ev.preventDefault();
						this.submit(value);
					}
				});
			});

		const footer = contentEl.createDiv({ cls: "chess-study-paste-modal-footer" });
		footer
			.createEl("button", {
				text: this.opts.submitLabel ?? "Insert",
				attr: { type: "button" },
			})
			.addEventListener("click", () => this.submit(value));
		footer
			.createEl("button", { text: "Cancel", attr: { type: "button" } })
			.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private submit(text: string): void {
		this.onSubmit(text);
		this.close();
	}
}
