import { Editor, MarkdownView, Notice } from "obsidian";
import type CaissaPlugin from "../main";
import { OpeningPickerModal } from "../ui/opening-picker";
import { EndgamePickerModal } from "../ui/endgame-picker";
import { WccMatchPickerModal } from "../ui/wcc-picker";
import { OpeningsQuizModal } from "../ui/openings-quiz";
import { parseLichessId } from "../chess/lichess-games";

/**
 * Register all editor / command palette commands. Stable command IDs only —
 * never rename these once released.
 */
export function registerCommands(plugin: CaissaPlugin): void {
	plugin.addCommand({
		id: "insert-chess-board",
		name: "Insert chess board",
		editorCallback: (editor: Editor) => {
			insertSnippet(editor, ["```chess", "", "```", ""].join("\n"));
		},
	});

	plugin.addCommand({
		id: "insert-chess-opening",
		name: "Insert chess opening from library",
		editorCheckCallback: (
			checking: boolean,
			editor: Editor,
			view: MarkdownView
		) => {
			if (!view) return false;
			if (checking) return true;
			new OpeningPickerModal(plugin.app, (result) => {
				const lines = ["```chess"];
				lines.push(`opening: ${result.openingName}`);
				if (result.variationName) {
					lines.push(`variation: ${result.variationName}`);
				}
				lines.push("```", "");
				insertSnippet(editor, lines.join("\n"));
			}).open();
			return true;
		},
	});

	plugin.addCommand({
		id: "insert-chess-endgame",
		name: "Insert chess endgame from library",
		editorCheckCallback: (
			checking: boolean,
			editor: Editor,
			view: MarkdownView
		) => {
			if (!view) return false;
			if (checking) return true;
			new EndgamePickerModal(plugin.app, (endgame) => {
				const lines = ["```chess", `endgame: ${endgame.id}`, "```", ""];
				insertSnippet(editor, lines.join("\n"));
			}).open();
			return true;
		},
	});

	plugin.addCommand({
		id: "insert-chess-wcc-game",
		name: "Insert chess world championship game",
		editorCheckCallback: (
			checking: boolean,
			editor: Editor,
			view: MarkdownView
		) => {
			if (!view) return false;
			if (checking) return true;
			new WccMatchPickerModal(plugin.app, (game) => {
				const lines = ["```chess", `wccgame: ${game.id}`, "```", ""];
				insertSnippet(editor, lines.join("\n"));
			}).open();
			return true;
		},
	});

	plugin.addCommand({
		id: "insert-chess-from-fen",
		name: "Insert chess board from clipboard fen",
		editorCallback: (editor: Editor) => {
			const clip = (navigator.clipboard as Clipboard | undefined)
				?.readText
				? navigator.clipboard.readText().catch(() => "")
				: Promise.resolve("");
			void clip.then((text) => {
				const fen = looksLikeFen(text) ? text.trim() : "";
				const lines = ["```chess"];
				lines.push(`fen: ${fen || "<paste FEN here>"}`);
				lines.push("```", "");
				insertSnippet(editor, lines.join("\n"));
				if (!fen) {
					new Notice("Replace <paste FEN here> with a real FEN string.");
				}
			});
		},
	});

	plugin.addCommand({
		id: "insert-chess-from-lichess",
		name: "Insert chess game from lichess link",
		editorCallback: (editor: Editor) => {
			const clip = (navigator.clipboard as Clipboard | undefined)
				?.readText
				? navigator.clipboard.readText().catch(() => "")
				: Promise.resolve("");
			void clip.then((text) => {
				const id = parseLichessId(text ?? "");
				const lines = ["```chess"];
				lines.push(`lichess: ${id ?? "<paste lichess game url here>"}`);
				lines.push("```", "");
				insertSnippet(editor, lines.join("\n"));
				if (!id) {
					new Notice(
						"Replace <paste lichess game url here> with a real Lichess game URL or ID."
					);
				}
			});
		},
	});

	plugin.addCommand({
		id: "start-openings-quiz",
		name: "Start openings quiz",
		callback: () => {
			new OpeningsQuizModal(plugin.app, plugin.settings).open();
		},
	});

	plugin.addCommand({
		id: "insert-chess-from-pgn",
		name: "Insert chess game from clipboard pgn",
		editorCallback: (editor: Editor) => {
			const clip = (navigator.clipboard as Clipboard | undefined)
				?.readText
				? navigator.clipboard.readText().catch(() => "")
				: Promise.resolve("");
			void clip.then((text) => {
				const pgn = (text ?? "").trim();
				const lines = ["```chess"];
				if (pgn) {
					lines.push(pgn);
				} else {
					lines.push("<paste PGN here>");
				}
				lines.push("```", "");
				insertSnippet(editor, lines.join("\n"));
				if (!pgn) {
					new Notice(
						"Replace <paste PGN here> with PGN text (headers and/or moves)."
					);
				}
			});
		},
	});
}

/** Insert a snippet at the cursor, leaving the cursor on the first blank line. */
function insertSnippet(editor: Editor, snippet: string): void {
	const cursor = editor.getCursor();
	editor.replaceRange(snippet, cursor);
	editor.setCursor({
		line: cursor.line + 1,
		ch: 0,
	});
}

function looksLikeFen(text: string): boolean {
	if (!text) return false;
	const t = text.trim();
	const parts = t.split(/\s+/);
	if (parts.length < 4) return false;
	const placement = parts[0] ?? "";
	if (!/^[1-8prnbqkPRNBQK/]+$/.test(placement)) return false;
	if (placement.split("/").length !== 8) return false;
	return true;
}
