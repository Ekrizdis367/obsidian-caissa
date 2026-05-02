import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type CaissaSettings } from "./types";
import { CaissaSettingTab } from "./settings";
import { registerCommands } from "./commands";
import { renderChessBlock } from "./ui/chess-block";
import { parseBlockConfig } from "./utils/parser";
import { terminateEngine } from "./chess/engine-worker";

export default class CaissaPlugin extends Plugin {
	settings: CaissaSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new CaissaSettingTab(this.app, this));

		registerCommands(this);

		this.registerMarkdownCodeBlockProcessor("chess", (source, el, ctx) => {
			const config = parseBlockConfig(source);
			renderChessBlock({
				host: el,
				config,
				settings: this.settings,
				app: this.app,
				ctx,
			});
		});
	}

	onunload(): void {
		// Tear down the shared Stockfish worker so reload/disable doesn't
		// leak the (possibly running) analyzer.
		terminateEngine();
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<CaissaSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
