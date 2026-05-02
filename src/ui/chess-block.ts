import {
	App,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	MarkdownRenderChild,
	Menu,
	Notice,
	setIcon,
} from "obsidian";
import type { ChessBlockConfig, CaissaSettings, PgnHeaders } from "../types";
import {
	buildPositions,
	pickOpeningDescription,
	type BuildResult,
	type PositionStep,
} from "../chess/engine";
import { findOpening } from "../chess/openings";
import { fetchExplorer } from "../chess/explorer";
import { fetchLichessGame } from "../chess/lichess-games";
import { renderBoard } from "./board-renderer";
import { renderMoveList } from "./move-list";
import { fenInfo, renderLinesPanel } from "./lines-panel";
import { renderInlinePicker } from "./inline-picker";
import { rewriteChessBlock } from "../utils/block-rewrite";
import { parseArrows, parseHighlights } from "../utils/annotations";
import {
	computeCaptured,
	hasAnyCaptures,
} from "../utils/captured-pieces";
import { renderCapturedTray } from "./captured-tray";
import {
	copyBoardAsPng,
	copyBoardAsSvg,
	downloadBoardAsPng,
	downloadBoardAsSvg,
} from "../utils/export-board";
import {
	createAnalysisController,
	type AnalysisController,
} from "./analysis-panel";
import { createEvalGraphController } from "./eval-graph";
import { renderPlayBlock } from "./play-controller";
import { renderFreeBoardBlock } from "./free-board-controller";

/**
 * For built-in opening blocks (no PGN / Lichess / headers), always read the
 * blurb from the bundled library at render time so preview never shows stale
 * or theme-clamped fragments from an older pipeline.
 */
function studyDescriptionForDisplay(
	config: ChessBlockConfig,
	result: BuildResult
): string | undefined {
	if (result.headers) return result.resolvedDescription?.trim();
	if (config.pgn?.trim() || config.lichess?.trim()) {
		return result.resolvedDescription?.trim();
	}
	if (config.wccgame?.trim() || config.endgame?.trim()) {
		return result.resolvedDescription?.trim();
	}
	const openingName = config.opening?.trim();
	if (openingName) {
		const hit = findOpening(config.opening, config.variation);
		if (hit) {
			const lib = pickOpeningDescription(hit);
			if (lib) return lib;
		}
	}
	return result.resolvedDescription?.trim();
}

function createOpeningGuideLink(parent: HTMLElement, guideUrl: string): void {
	const url = guideUrl.trim();
	if (!url) return;
	const a = parent.createEl("a", {
		cls: "chess-study-opening-guide-link",
		href: url,
		attr: {
			target: "_blank",
			rel: "noopener noreferrer",
			"aria-label": "Open opening explorer on lichess.org",
			title: "Open lichess.org opening explorer",
		},
	});
	setIcon(a, "link");
}

/**
 * Heading line: title text with optional trailing explorer link (opening library).
 */
function mountStudyTitle(
	host: HTMLElement,
	title: string,
	guideUrl: string | undefined
): void {
	const trimmedUrl = guideUrl?.trim();
	if (trimmedUrl) {
		const row = host.createDiv({ cls: "chess-study-title-row" });
		row.createDiv({ cls: "chess-study-title", text: title });
		createOpeningGuideLink(row, trimmedUrl);
	} else {
		host.createDiv({ cls: "chess-study-title", text: title });
	}
}

/**
 * Renders the optional study blurb under the title via Obsidian's markdown
 * pipeline (paragraphs, links) plus an icon-only external guide link when it
 * was not placed inline on the title row.
 */
function appendStudyDescriptionBlock(
	app: App,
	ctx: MarkdownPostProcessorContext,
	host: HTMLElement,
	description: string | undefined,
	guideUrl: string | undefined
): void {
	const trimmed = description?.trim();
	const guideTrimmed = guideUrl?.trim();
	if (!trimmed && !guideTrimmed) return;
	const wrap = host.createDiv({ cls: "chess-study-description" });
	const appendGuideIfNeeded = (): void => {
		if (guideTrimmed) createOpeningGuideLink(wrap, guideTrimmed);
	};
	if (trimmed) {
		const child = new MarkdownRenderChild(wrap);
		ctx.addChild(child);
		void MarkdownRenderer.render(
			app,
			trimmed,
			wrap,
			ctx.sourcePath,
			child
		).then(() => {
			appendGuideIfNeeded();
		});
	} else {
		appendGuideIfNeeded();
	}
}

export interface ChessBlockViewArgs {
	host: HTMLElement;
	config: ChessBlockConfig;
	settings: CaissaSettings;
	/** Obsidian app handle, used to rewrite the source file when the inline picker is used. */
	app: App;
	/** Markdown context for locating the block's line range in the source file. */
	ctx: MarkdownPostProcessorContext;
}

/**
 * Render an entire interactive chess study block (board + moves + controls)
 * into a host element. Stores its mutable state (current step + orientation)
 * locally and re-renders on each interaction.
 */
export function renderChessBlock(args: ChessBlockViewArgs): void {
	const { host, config, settings, app, ctx } = args;
	host.empty();
	host.classList.add("chess-study-block");

	if (config.lichess) {
		renderRemoteLichessBlock(host, config, settings, app, ctx);
		return;
	}

	const result = buildPositions({
		opening: config.freeboard ? undefined : config.opening,
		variation: config.freeboard ? undefined : config.variation,
		endgame: config.freeboard ? undefined : config.endgame,
		wccgame: config.freeboard ? undefined : config.wccgame,
		moves: config.moves,
		pgn: config.freeboard ? undefined : config.pgn,
		fen: config.fen,
	});

	if (config.freeboard && !config.play) {
		if (result.error) {
			host.createDiv({
				cls: "chess-study-error",
				text: result.error,
			});
			return;
		}
		const start = result.steps[0];
		if (start) {
			renderFreeBoardBlock({
				host,
				config,
				settings,
				app,
				ctx,
				startFen: start.fen,
			});
			return;
		}
	}

	// Play-vs-Stockfish hijacks the entire block: the user is making
	// moves, not stepping a fixed sequence, so the standard mountResult
	// flow doesn't apply. We pull the *first* (starting) FEN from the
	// build result so any opening/endgame/FEN config still seeds the game.
	if (config.play && result.steps.length > 0 && !result.error) {
		const startStep =
			result.steps[Math.max(0, (config.startMove ?? 0) | 0)] ??
			result.steps[0];
		if (startStep) {
			renderPlayBlock({
				host,
				startFen: startStep.fen,
				humanColor: pickHumanColor(config.play),
				level: config.level ?? 8,
				config,
				settings,
				app,
			});
			return;
		}
	}

	mountResult(host, config, settings, result, app, ctx);
}

/**
 * Resolve the `play:` config (which can be "white", "black", or "random")
 * to a concrete piece color. Random is decided once at mount time so the
 * orientation doesn't flip mid-game on a re-render.
 */
function pickHumanColor(play: NonNullable<ChessBlockConfig["play"]>): "w" | "b" {
	if (play === "white") return "w";
	if (play === "black") return "b";
	return Math.random() < 0.5 ? "w" : "b";
}

/**
 * Async path: fetch a Lichess game over HTTPS, then render it. Shows a
 * loading shimmer while in flight and an inline error if it fails.
 */
function renderRemoteLichessBlock(
	host: HTMLElement,
	config: ChessBlockConfig,
	settings: CaissaSettings,
	app: App,
	ctx: MarkdownPostProcessorContext
): void {
	const id = config.lichess?.trim() ?? "";

	const loading = host.createDiv({
		cls: "chess-study-loading",
		text: `Loading Lichess game…`,
	});

	fetchLichessGame(id)
		.then((pgn) => {
			loading.remove();
			const result = buildPositions({ pgn });
			mountResult(host, config, settings, result, app, ctx);
		})
		.catch((err: Error) => {
			loading.remove();
			host.createDiv({
				cls: "chess-study-error",
				text: `Could not load Lichess game "${id}": ${err.message}`,
			});
		});
}

/**
 * Shared mount path: takes a {@link BuildResult} and renders headers, the
 * board, the move list, controls, and the optional explorer panel.
 */
function mountResult(
	host: HTMLElement,
	config: ChessBlockConfig,
	settings: CaissaSettings,
	result: BuildResult,
	app: App,
	ctx: MarkdownPostProcessorContext
): void {
	// If the block has no concrete position content (no pgn/moves/fen/lichess),
	// show the cascading category picker above the board so the user can pick
	// a starting position without editing the source manually. The picker
	// rewrites the block's source on change, which triggers a re-render.
	const showInlinePicker =
		!config.pgn &&
		!config.moves &&
		!config.fen &&
		!config.lichess &&
		!config.freeboard;
	if (showInlinePicker) {
		renderPickerStrip(host, config, app, ctx);
	}

	const putGuideInTitle =
		Boolean(result.resolvedGuideUrl?.trim()) &&
		!result.headers &&
		(Boolean(config.title) || Boolean(result.resolvedTitle));

	if (config.title) {
		mountStudyTitle(
			host,
			config.title,
			putGuideInTitle ? result.resolvedGuideUrl : undefined
		);
	} else if (result.headers) {
		renderGameHeader(host, result.headers);
	} else if (result.resolvedTitle) {
		mountStudyTitle(
			host,
			result.resolvedTitle,
			putGuideInTitle ? result.resolvedGuideUrl : undefined
		);
	}

	// Opening/endgame blurbs; explorer link only here when there is no title row
	// to attach it to. Skip when PGN headers are shown.
	const displayDescription = studyDescriptionForDisplay(config, result);
	const guideForDescription = putGuideInTitle
		? undefined
		: result.resolvedGuideUrl;
	const hasStudyNotes =
		Boolean(displayDescription?.trim()) ||
		Boolean(guideForDescription?.trim());
	if (hasStudyNotes && !result.headers) {
		appendStudyDescriptionBlock(
			app,
			ctx,
			host,
			displayDescription,
			guideForDescription
		);
	}

	const size = config.size ?? "medium";
	// Default to showing the moves panel even when the block has no moves
	// (yet) — it reserves the space and constrains the picker bars to a
	// natural width. The user can opt out with `showMoves: false`.
	const showMoves = config.showMoves ?? true;

	const layout = host.createDiv({
		cls: `chess-study-layout size-${size}${showMoves ? "" : " no-moves"}`,
		attr: {
			tabindex: "0",
			role: "group",
			"aria-label":
				"Chess study board. Arrow keys step through moves, F flips the board.",
		},
	});
	// Trays sit in the board column only (above/below the square board) so
	// captures stay visually tied to the board; the move list pairs in a row
	// with that column so its height still tracks the full board column.
	const boardStack = layout.createDiv({ cls: "chess-study-board-stack" });
	const boardMovesRow = boardStack.createDiv({
		cls: "chess-study-board-moves-row",
	});
	const boardCol = boardMovesRow.createDiv({ cls: "chess-study-board-col" });
	const topTrayHost = boardCol.createDiv({
		cls: "chess-study-captured-wrap chess-study-captured-top",
	});
	const boardHost = boardCol.createDiv({ cls: "chess-study-board-wrap" });
	const bottomTrayHost = boardCol.createDiv({
		cls: "chess-study-captured-wrap chess-study-captured-bottom",
	});
	const sideCol = showMoves
		? boardMovesRow.createDiv({ cls: "chess-study-side-col" })
		: null;
	const movesHost =
		sideCol?.createDiv({ cls: "chess-study-moves-wrap" }) ?? null;

	const analyzeEnabled = config.analyze === true;
	const analysisHost = analyzeEnabled
		? (sideCol ?? layout).createDiv({
				cls: "chess-study-analysis-wrap",
		  })
		: null;

	const controlsHost = boardCol.createDiv({ cls: "chess-study-controls" });
	const evalGraphHost = analyzeEnabled
		? host.createDiv({ cls: "chess-study-eval-graph-wrap" })
		: null;
	let analysisController: AnalysisController | null = null;
	let evalGraphController: ReturnType<typeof createEvalGraphController> | null =
		null;
	if (analysisHost) {
		analysisController = createAnalysisController(analysisHost);
	}

	const explorerEnabled =
		config.explorer ?? settings.enableOpeningExplorer;
	const explorerSource =
		config.explorerSource ?? settings.explorerSource;

	const linesHost = explorerEnabled
		? host.createDiv({ cls: "chess-study-lines-wrap" })
		: null;

	const showControls =
		config.interactive ?? settings.showInteractiveControls;
	const showCoords = config.coordinates ?? settings.showCoordinates;

	const state = {
		index: clampIndex(
			config.startMove ?? result.steps.length - 1,
			result.steps
		),
		orientation:
			config.orientation ?? settings.defaultOrientation,
		fetchToken: 0,
	};

	const updateLinesPanel = (step: PositionStep) => {
		if (!linesHost) return;
		const myToken = ++state.fetchToken;
		const { fullMoveNumber, turn } = fenInfo(step.fen);
		renderLinesPanel(linesHost, { kind: "loading" });
		fetchExplorer(step.fen, explorerSource, settings.lichessApiToken)
			.then((res) => {
				if (myToken !== state.fetchToken) return;
				if (res.totalGames === 0 && res.moves.length === 0) {
					renderLinesPanel(linesHost, {
						kind: "empty",
						source: explorerSource,
					});
					return;
				}
				renderLinesPanel(linesHost, {
					kind: "ready",
					result: res,
					fullMoveNumber,
					turn,
					maxLines: settings.explorerMaxLines,
				});
			})
			.catch((err: Error) => {
				if (myToken !== state.fetchToken) return;
				renderLinesPanel(linesHost, {
					kind: "error",
					message: err.message,
				});
			});
	};

	const arrows = parseArrows(config.arrows);
	const highlights = parseHighlights(config.highlights);
	const showCaptured =
		config.captured ?? settings.showCapturedPieces;
	const pieceSet = config.pieces ?? settings.pieceSet;

	const drawCapturedTrays = () => {
		if (!showCaptured) {
			topTrayHost.empty();
			bottomTrayHost.empty();
			topTrayHost.classList.add("is-hidden");
			bottomTrayHost.classList.add("is-hidden");
			return;
		}
		const totals = computeCaptured(result.steps, state.index);
		topTrayHost.classList.remove("is-hidden");
		bottomTrayHost.classList.remove("is-hidden");
		// The tray on a side belongs to the player on that side. With
		// orientation=white, white sits at the bottom, so the bottom tray
		// shows white's captures and the top tray shows black's.
		const bottomColor = state.orientation === "white" ? "w" : "b";
		const topColor = bottomColor === "w" ? "b" : "w";
		const topLabel =
			topColor === "w"
				? "Pieces captured by White"
				: "Pieces captured by Black";
		const bottomLabel =
			bottomColor === "w"
				? "Pieces captured by White"
				: "Pieces captured by Black";
		topTrayHost.setAttribute("aria-label", topLabel);
		bottomTrayHost.setAttribute("aria-label", bottomLabel);
		// Always render both trays when captured pieces are enabled so the
		// layout height stays stable (empty trays still reserve a row).
		renderCapturedTray(topTrayHost, {
			color: topColor,
			totals,
			pieceSet,
			showAdvantage: hasAnyCaptures(totals),
		});
		renderCapturedTray(bottomTrayHost, {
			color: bottomColor,
			totals,
			pieceSet,
			showAdvantage: hasAnyCaptures(totals),
		});
	};

	const draw = () => {
		const step = result.steps[state.index] ?? result.steps[0];
		if (!step) return;
		renderBoard(boardHost, {
			fen: step.fen,
			orientation: state.orientation,
			pieceSet,
			lightColor: config.light ?? settings.lightSquareColor,
			darkColor: config.dark ?? settings.darkSquareColor,
			highlightColor: settings.lastMoveColor,
			coordinateColor: settings.coordinateColor,
			showCoordinates: showCoords,
			from: step.from,
			to: step.to,
			arrows,
			highlights,
		});
		drawCapturedTrays();
		if (movesHost) {
			renderMoveList(movesHost, {
				steps: result.steps,
				activeIndex: state.index,
				pieceSet,
				onSelect: (idx) => {
					state.index = clampIndex(idx, result.steps);
					draw();
				},
			});
		}
		updateLinesPanel(step);
		analysisController?.update(step.fen);
		evalGraphController?.setActiveIndex(state.index);
	};

	const goFirst = () => {
		state.index = 0;
		draw();
	};
	const goPrev = () => {
		state.index = clampIndex(state.index - 1, result.steps);
		draw();
	};
	const goNext = () => {
		state.index = clampIndex(state.index + 1, result.steps);
		draw();
	};
	const goLast = () => {
		state.index = result.steps.length - 1;
		draw();
	};
	const flip = () => {
		state.orientation =
			state.orientation === "white" ? "black" : "white";
		draw();
	};

	if (showControls) {
		buildControls(controlsHost, {
			canStep: result.steps.length > 1,
			onFirst: goFirst,
			onPrev: goPrev,
			onNext: goNext,
			onLast: goLast,
			onFlip: flip,
		});
	}

	bindKeyboardShortcuts(layout, {
		canStep: result.steps.length > 1,
		onFirst: goFirst,
		onPrev: goPrev,
		onNext: goNext,
		onLast: goLast,
		onFlip: flip,
	});

	bindBoardExportMenu(boardHost, () => result.steps[state.index]?.fen);

	if (evalGraphHost && result.steps.length > 1) {
		evalGraphController = createEvalGraphController(evalGraphHost, {
			steps: result.steps,
			onJumpTo: (idx) => {
				state.index = clampIndex(idx, result.steps);
				draw();
			},
		});
	}

	if (result.error) {
		host.createDiv({
			cls: "chess-study-error",
			text: result.error,
		});
	}

	draw();
}

/**
 * Render a structured header strip from PGN tags. Skips gracefully if no
 * meaningful fields are present.
 */
function renderGameHeader(host: HTMLElement, headers: PgnHeaders): void {
	const hasMeaningfulHeader =
		headers.white || headers.black || headers.event;
	if (!hasMeaningfulHeader) return;

	const wrap = host.createDiv({ cls: "chess-study-game-header" });

	if (headers.white || headers.black) {
		const players = wrap.createDiv({ cls: "chess-study-players" });
		appendPlayer(players, "white", headers.white, headers.whiteElo, headers.whiteTitle);
		players.createSpan({ cls: "chess-study-versus", text: "vs" });
		appendPlayer(players, "black", headers.black, headers.blackElo, headers.blackTitle);
		if (headers.result) {
			players.createSpan({
				cls: "chess-study-result",
				text: prettyResult(headers.result),
			});
		}
	}

	const metaBits: string[] = [];
	if (headers.event) metaBits.push(headers.event);
	if (headers.round && headers.round !== "-") metaBits.push(`Round ${headers.round}`);
	if (headers.date && headers.date !== "????.??.??") metaBits.push(headers.date);
	if (headers.eco && headers.openingName) {
		metaBits.push(`${headers.eco} · ${headers.openingName}`);
	} else if (headers.eco) {
		metaBits.push(headers.eco);
	} else if (headers.openingName) {
		metaBits.push(headers.openingName);
	}
	if (metaBits.length) {
		wrap.createDiv({ cls: "chess-study-game-meta", text: metaBits.join(" · ") });
	}
}

function appendPlayer(
	host: HTMLElement,
	color: "white" | "black",
	name: string | undefined,
	elo: string | undefined,
	title: string | undefined
): void {
	const wrap = host.createSpan({ cls: `chess-study-player chess-study-player-${color}` });
	wrap.createSpan({ cls: "chess-study-player-dot", attr: { "aria-hidden": "true" } });
	if (title) {
		wrap.createSpan({ cls: "chess-study-player-title", text: title });
	}
	wrap.createSpan({ cls: "chess-study-player-name", text: name ?? "?" });
	if (elo) {
		wrap.createSpan({ cls: "chess-study-player-elo", text: `(${elo})` });
	}
}

function prettyResult(result: string): string {
	switch (result) {
		case "1-0":
			return "1–0";
		case "0-1":
			return "0–1";
		case "1/2-1/2":
			return "½–½";
		default:
			return result;
	}
}

/**
 * Render the inline category/opening/endgame/WCC picker strip above the
 * board. Any change rewrites the block's source via {@link rewriteChessBlock},
 * which causes Obsidian to re-render the block with the updated config.
 *
 * Each emitted update clears every category-specific key (opening, variation,
 * endgame, wccgame) and reapplies only the ones present in the update — that
 * way switching between categories doesn't leave stale keys behind.
 */
function renderPickerStrip(
	host: HTMLElement,
	config: ChessBlockConfig,
	app: App,
	ctx: MarkdownPostProcessorContext
): void {
	const pickerHost = host.createDiv({ cls: "chess-study-inline-picker-wrap" });
	renderInlinePicker(pickerHost, {
		currentOpening: config.opening,
		currentVariation: config.variation,
		currentEndgame: config.endgame,
		currentWccGame: config.wccgame,
		currentFreeboard: config.freeboard === true,
		onChange: (update) => {
			void rewriteChessBlock(app, ctx, host, {
				opening: update.opening ?? "",
				variation: update.variation ?? "",
				endgame: update.endgame ?? "",
				wccgame: update.wccgame ?? "",
				fen: update.fen ?? "",
				moves: update.moves ?? "",
				freeboard: update.freeboard ?? "",
			});
		},
	});
}

function clampIndex(idx: number, steps: PositionStep[]): number {
	if (steps.length === 0) return 0;
	if (idx < 0) return 0;
	if (idx > steps.length - 1) return steps.length - 1;
	return idx;
}

interface ControlsArgs {
	canStep: boolean;
	onFirst: () => void;
	onPrev: () => void;
	onNext: () => void;
	onLast: () => void;
	onFlip: () => void;
}

function buildControls(host: HTMLElement, args: ControlsArgs): void {
	host.empty();

	const make = (
		label: string,
		icon: string,
		onClick: () => void,
		opts: { disabled?: boolean } = {}
	) => {
		const btn = host.createEl("button", {
			cls: "chess-study-control",
			attr: { "aria-label": label, type: "button", title: label },
		});
		setIcon(btn, icon);
		if (opts.disabled) btn.setAttribute("disabled", "true");
		btn.addEventListener("click", onClick);
		return btn;
	};

	make("Start position", "chevrons-left", args.onFirst, {
		disabled: !args.canStep,
	});
	make("Previous move (←)", "chevron-left", args.onPrev, {
		disabled: !args.canStep,
	});
	make("Next move (→)", "chevron-right", args.onNext, {
		disabled: !args.canStep,
	});
	make("Last move", "chevrons-right", args.onLast, {
		disabled: !args.canStep,
	});

	host.createSpan({ cls: "chess-study-control-spacer" });

	make("Flip board (F)", "refresh-cw", args.onFlip);
}

/**
 * Wire up keyboard shortcuts that fire when the block (or any descendant
 * that isn't a text input) has focus. Shortcuts:
 *
 *   ←  / Page Up   — previous move
 *   →  / Page Down — next move
 *   Home           — first position
 *   End            — last position
 *   F              — flip the board
 *
 * The block container is given `tabindex="0"` so users can tab into it
 * (and click also focuses it). We deliberately scope the listener to the
 * block so multiple blocks on the same page don't fight over keys, and
 * we ignore events targeted at editable elements so typing in a future
 * search/quiz field would still work.
 */
function bindKeyboardShortcuts(
	layout: HTMLElement,
	args: ControlsArgs
): void {
	layout.addEventListener("keydown", (ev) => {
		const target = ev.target as HTMLElement | null;
		if (target && isEditableTarget(target)) return;

		switch (ev.key) {
			case "ArrowLeft":
			case "PageUp":
				if (!args.canStep) return;
				args.onPrev();
				break;
			case "ArrowRight":
			case "PageDown":
				if (!args.canStep) return;
				args.onNext();
				break;
			case "Home":
				if (!args.canStep) return;
				args.onFirst();
				break;
			case "End":
				if (!args.canStep) return;
				args.onLast();
				break;
			case "f":
			case "F":
				if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
				args.onFlip();
				break;
			default:
				return;
		}
		ev.preventDefault();
		ev.stopPropagation();
	});

	// Click anywhere inside the block focuses it so keyboard shortcuts
	// take effect immediately — without this users would have to Tab in.
	layout.addEventListener("mousedown", (ev) => {
		const target = ev.target as HTMLElement | null;
		if (target && isEditableTarget(target)) return;
		// Defer so any control-button click handlers run with normal focus first.
		window.setTimeout(() => layout.focus({ preventScroll: true }), 0);
	});
}

function isEditableTarget(el: HTMLElement): boolean {
	const tag = el.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if (el.isContentEditable) return true;
	return false;
}

/**
 * Right-click (or long-press on touch) on the board to open an export menu:
 *
 *   - Copy as image (PNG to clipboard)
 *   - Copy as SVG  (XML text to clipboard)
 *   - Save as PNG  (download)
 *   - Save as SVG  (download)
 *
 * `getCurrentFen` is read lazily so the exported image always reflects the
 * board's *current* position (after stepping/flipping), not the one shown
 * when the block first rendered.
 */
function bindBoardExportMenu(
	boardHost: HTMLElement,
	getCurrentFen: () => string | undefined
): void {
	boardHost.addEventListener("contextmenu", (ev) => {
		const svg = boardHost.querySelector("svg");
		if (!svg) return;
		ev.preventDefault();

		const filename = boardFilename(getCurrentFen());

		const menu = new Menu();
		menu.addItem((item) =>
			item
				.setTitle("Copy as image")
				.setIcon("clipboard-copy")
				.onClick(async () => {
					try {
						await copyBoardAsPng(svg as SVGElement);
						new Notice("Board copied as PNG");
					} catch (err) {
						new Notice(`Copy failed: ${(err as Error).message}`);
					}
				})
		);
		menu.addItem((item) =>
			item
				.setTitle("Copy as SVG")
				.setIcon("clipboard-copy")
				.onClick(async () => {
					try {
						await copyBoardAsSvg(svg as SVGElement);
						new Notice("Board SVG copied to clipboard");
					} catch (err) {
						new Notice(`Copy failed: ${(err as Error).message}`);
					}
				})
		);
		menu.addSeparator();
		menu.addItem((item) =>
			item
				.setTitle("Save as PNG")
				.setIcon("image-down")
				.onClick(async () => {
					try {
						await downloadBoardAsPng(
							svg as SVGElement,
							`${filename}.png`
						);
					} catch (err) {
						new Notice(
							`Save failed: ${(err as Error).message}`
						);
					}
				})
		);
		menu.addItem((item) =>
			item
				.setTitle("Save as SVG")
				.setIcon("image-down")
				.onClick(async () => {
					try {
						await downloadBoardAsSvg(
							svg as SVGElement,
							`${filename}.svg`
						);
					} catch (err) {
						new Notice(
							`Save failed: ${(err as Error).message}`
						);
					}
				})
		);
		menu.showAtMouseEvent(ev);
	});
}

/**
 * Build a sensible filename from a FEN: a fixed `caissa-board-` prefix plus
 * the board placement segment (with `/` replaced so it's filesystem-safe).
 * Falls back to a timestamp if no FEN is available.
 */
function boardFilename(fen: string | undefined): string {
	if (!fen) {
		return `caissa-board-${Date.now()}`;
	}
	const placement = fen.split(" ")[0] ?? "";
	const safe = placement.replace(/\//g, "-").slice(0, 80);
	return `caissa-board-${safe || Date.now()}`;
}
