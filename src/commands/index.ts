import { Editor, MarkdownView, Notice } from "obsidian";
import type CaissaPlugin from "../main";
import { OpeningPickerModal } from "../ui/opening-picker";
import { EndgamePickerModal } from "../ui/endgame-picker";
import { WccMatchPickerModal } from "../ui/wcc-picker";
import { OpeningsQuizModal } from "../ui/openings-quiz";
import { PasteTextModal } from "../ui/paste-text-modal";
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
		name: "Insert chess board from fen",
		editorCallback: (editor: Editor) => {
			new PasteTextModal(
				plugin.app,
				{
					title: "Insert board from fen",
					description:
						"Paste a FEN string below. The block is inserted when you confirm.",
					placeholder: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
				},
				(text) => {
					const fen = looksLikeFen(text) ? text.trim() : "";
					const lines = ["```chess"];
					lines.push(`fen: ${fen || "<paste FEN here>"}`);
					lines.push("```", "");
					insertSnippet(editor, lines.join("\n"));
					if (!fen) {
						new Notice("Replace <paste FEN here> with a real FEN string.");
					}
				}
			).open();
		},
	});

	plugin.addCommand({
		id: "insert-chess-from-lichess",
		name: "Insert chess game from lichess link",
		editorCallback: (editor: Editor) => {
			new PasteTextModal(
				plugin.app,
				{
					title: "Insert game from lichess",
					description:
						"Paste a Lichess game URL or game ID below.",
					placeholder: "https://lichess.org/abcdefgh",
				},
				(text) => {
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
				}
			).open();
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
		name: "Insert chess game from pgn",
		editorCallback: (editor: Editor) => {
			new PasteTextModal(
				plugin.app,
				{
					title: "Insert game from pgn",
					description:
						"Paste PGN text (headers and/or moves) below.",
					placeholder: "[Event \"?\"]\n\n1. e4 e5 2. Nf3 Nc6",
					rows: 10,
				},
				(text) => {
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
				}
			).open();
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
