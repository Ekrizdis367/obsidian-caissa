import { App, PluginSettingTab, Setting } from "obsidian";
import type CaissaPlugin from "./main";
import {
	BOARD_COLOR_PRESETS,
	DEFAULT_SETTINGS,
	type ExplorerSource,
	type Orientation,
	type PieceSet,
} from "./types";

const CUSTOM_PRESET_ID = "custom";

/** Match the current light/dark colors against the preset list. */
function matchPresetId(light: string, dark: string): string {
	const l = light.trim().toLowerCase();
	const d = dark.trim().toLowerCase();
	const hit = BOARD_COLOR_PRESETS.find(
		(p) => p.light.toLowerCase() === l && p.dark.toLowerCase() === d
	);
	return hit?.id ?? CUSTOM_PRESET_ID;
}

export class CaissaSettingTab extends PluginSettingTab {
	plugin: CaissaPlugin;

	constructor(app: App, plugin: CaissaPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Appearance").setHeading();

		new Setting(containerEl)
			.setName("Piece set")
			.setDesc("Style used to draw the chess pieces.")
			.addDropdown((dd) => {
				const options: Array<[PieceSet, string]> = [
					["cburnett", "Cburnett"],
					["merida", "Merida"],
					["staunty", "Staunty"],
					["caliente", "Caliente"],
					["pixel", "Pixel"],
					["letter", "Letter"],
					["unicode", "Unicode"],
				];
				for (const [value, label] of options) {
					dd.addOption(value, label);
				}
				dd
					.setValue(this.plugin.settings.pieceSet)
					.onChange(async (value) => {
						this.plugin.settings.pieceSet = value as PieceSet;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Color preset")
			.setDesc(
				"Quick-select a board color scheme, or choose custom to set the light and dark square colors below by hand."
			)
			.addDropdown((dd) => {
				for (const preset of BOARD_COLOR_PRESETS) {
					dd.addOption(preset.id, preset.label);
				}
				dd.addOption(CUSTOM_PRESET_ID, "Custom");
				dd.setValue(
					matchPresetId(
						this.plugin.settings.lightSquareColor,
						this.plugin.settings.darkSquareColor
					)
				).onChange(async (value) => {
					if (value === CUSTOM_PRESET_ID) {
						return;
					}
					const preset = BOARD_COLOR_PRESETS.find(
						(p) => p.id === value
					);
					if (!preset) return;
					this.plugin.settings.lightSquareColor = preset.light;
					this.plugin.settings.darkSquareColor = preset.dark;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Light square color")
			.setDesc("CSS color for light squares.")
			.addText((t) =>
				t
					.setPlaceholder(DEFAULT_SETTINGS.lightSquareColor)
					.setValue(this.plugin.settings.lightSquareColor)
					.onChange(async (value) => {
						this.plugin.settings.lightSquareColor =
							value || DEFAULT_SETTINGS.lightSquareColor;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Dark square color")
			.setDesc("CSS color for dark squares.")
			.addText((t) =>
				t
					.setPlaceholder(DEFAULT_SETTINGS.darkSquareColor)
					.setValue(this.plugin.settings.darkSquareColor)
					.onChange(async (value) => {
						this.plugin.settings.darkSquareColor =
							value || DEFAULT_SETTINGS.darkSquareColor;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Last move highlight")
			.setDesc("Color used to highlight the most recent move.")
			.addText((t) =>
				t
					.setPlaceholder(DEFAULT_SETTINGS.lastMoveColor)
					.setValue(this.plugin.settings.lastMoveColor)
					.onChange(async (value) => {
						this.plugin.settings.lastMoveColor =
							value || DEFAULT_SETTINGS.lastMoveColor;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show coordinates")
			.setDesc("Display rank and file labels on the board.")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.showCoordinates)
					.onChange(async (value) => {
						this.plugin.settings.showCoordinates = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Defaults").setHeading();

		new Setting(containerEl)
			.setName("Default orientation")
			.setDesc("Side shown at the bottom of the board for new boards.")
			.addDropdown((dd) =>
				dd
					.addOption("white", "White")
					.addOption("black", "Black")
					.setValue(this.plugin.settings.defaultOrientation)
					.onChange(async (value) => {
						this.plugin.settings.defaultOrientation =
							value as Orientation;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show interactive controls")
			.setDesc(
				"Show first/previous/next/last and flip buttons under each board."
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.showInteractiveControls)
					.onChange(async (value) => {
						this.plugin.settings.showInteractiveControls = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show captured pieces")
			.setDesc(
				"Show captured-pieces trays and material balance above and below each board."
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.showCapturedPieces)
					.onChange(async (value) => {
						this.plugin.settings.showCapturedPieces = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Opening explorer").setHeading();

		const explorerDesc = containerEl.createDiv({
			cls: "setting-item-description chess-study-explorer-disclosure",
		});
		explorerDesc.createSpan({
			text:
				"When enabled, the plugin makes authenticated GET requests to " +
				"https://explorer.lichess.ovh per board position to fetch " +
				"win/draw/loss statistics. Only the position (FEN) and your " +
				"Lichess API token are sent. Off by default.",
		});

		const tokenDesc = document.createDocumentFragment();
		tokenDesc.appendChild(
			document.createTextNode(
				"Required by lichess as of 2026. Create a token (no scopes needed) at "
			)
		);
		const tokenLink = document.createElement("a");
		tokenLink.href = "https://lichess.org/account/oauth/token";
		tokenLink.textContent = "lichess.org/account/oauth/token";
		tokenDesc.appendChild(tokenLink);
		tokenDesc.appendChild(
			document.createTextNode(", then paste it here.")
		);

		new Setting(containerEl)
			.setName("Lichess API token")
			.setDesc(tokenDesc)
			.addText((t) => {
				t.inputEl.setAttribute("type", "password");
				t.inputEl.setAttribute("autocomplete", "off");
				t.inputEl.setAttribute("spellcheck", "false");
				t
					.setPlaceholder("Paste your token here")
					.setValue(this.plugin.settings.lichessApiToken)
					.onChange(async (value) => {
						this.plugin.settings.lichessApiToken = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Enable opening explorer")
			.setDesc(
				"Show win/draw/loss statistics for the current position next to each board."
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.enableOpeningExplorer)
					.onChange(async (value) => {
						this.plugin.settings.enableOpeningExplorer = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Data source")
			.setDesc(
				"Choose between the masters database (high-rated over-the-board games) or the lichess players database."
			)
			.addDropdown((dd) =>
				dd
					.addOption("masters", "Masters database")
					.addOption("lichess", "Lichess players")
					.setValue(this.plugin.settings.explorerSource)
					.onChange(async (value) => {
						this.plugin.settings.explorerSource =
							value as ExplorerSource;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Maximum lines to show")
			.setDesc("Cap on candidate moves displayed per position.")
			.addText((t) =>
				t
					.setPlaceholder(String(DEFAULT_SETTINGS.explorerMaxLines))
					.setValue(String(this.plugin.settings.explorerMaxLines))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						this.plugin.settings.explorerMaxLines =
							isNaN(n) || n < 1
								? DEFAULT_SETTINGS.explorerMaxLines
								: Math.min(n, 50);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).addButton((b) =>
			b
				.setButtonText("Reset to defaults")
				.setWarning()
				.onClick(async () => {
					this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
					await this.plugin.saveSettings();
					this.display();
				})
		);
	}
}
