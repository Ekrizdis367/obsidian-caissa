import { Chess, type Move, type Square } from "chess.js";
import {
	App,
	MarkdownPostProcessorContext,
	setIcon,
} from "obsidian";
import type { CaissaSettings, ChessBlockConfig, Orientation } from "../types";
import type { PositionStep } from "../chess/engine";
import { tokenizeMoves } from "../chess/engine";
import { renderBoard } from "./board-renderer";
import { renderMoveList } from "./move-list";
import { computeCaptured, hasAnyCaptures } from "../utils/captured-pieces";
import { renderCapturedTray } from "./captured-tray";
import { pickPromotionPiece } from "./promotion-picker";
import { rewriteChessBlock } from "../utils/block-rewrite";
import type { PieceType } from "../types";

const STANDARD_FEN = new Chess().fen();

export interface FreeBoardControllerArgs {
	host: HTMLElement;
	config: ChessBlockConfig;
	settings: CaissaSettings;
	app: App;
	ctx: MarkdownPostProcessorContext;
	/** Starting FEN from the resolved build (first step). */
	startFen: string;
}

type FreeBoardState = { kind: "playing"; selected: Square | null } | { kind: "over"; reason: string };

/**
 * Both sides human; moves persist into the note via `moves:` + `freeboard:`.
 */
export function renderFreeBoardBlock(args: FreeBoardControllerArgs): void {
	const { host, config, settings, app, ctx, startFen } = args;
	host.empty();
	host.classList.add("chess-study-block");

	const initialFen = startFen.trim() || STANDARD_FEN;
	const pieceSet = config.pieces ?? settings.pieceSet;
	const lightColor = config.light ?? settings.lightSquareColor;
	const darkColor = config.dark ?? settings.darkSquareColor;
	const showCoords = config.coordinates ?? settings.showCoordinates;
	const showMoves = config.showMoves ?? true;
	const showCaptured = config.captured ?? settings.showCapturedPieces;
	const size = config.size ?? "medium";

	let orientation: Orientation =
		config.orientation ?? settings.defaultOrientation;

	let chess = chessFromSaved(initialFen, config.moves);
	let state: FreeBoardState = { kind: "playing", selected: null };

	let persistTimer: number | null = null;

	const persist = (): void => {
		if (persistTimer !== null) window.clearTimeout(persistTimer);
		persistTimer = window.setTimeout(() => {
			persistTimer = null;
			void flushPersist();
		}, 280);
	};

	const flushPersist = async (): Promise<void> => {
		const movesLine = chess.history().join(" ");
		const fenForFile =
			initialFen !== STANDARD_FEN ? initialFen : "";

		await rewriteChessBlock(app, ctx, host, {
			opening: "",
			variation: "",
			endgame: "",
			wccgame: "",
			freeboard: "yes",
			moves: movesLine,
			fen: fenForFile,
		});
	};

	if (config.title) {
		host.createDiv({ cls: "chess-study-title", text: config.title });
	}

	const layout = host.createDiv({
		cls: `chess-study-layout size-${size}${showMoves ? "" : " no-moves"}`,
		attr: {
			tabindex: "0",
			role: "group",
			"aria-label":
				"Free board — both sides. Click a piece, then a destination. Moves save to this note.",
		},
	});

	// Same row structure as study blocks: board column + moves on the right.
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
	const controlsHost = boardCol.createDiv({
		cls: "chess-study-controls chess-study-play-controls",
	});

	const sideCol = showMoves
		? boardMovesRow.createDiv({ cls: "chess-study-side-col" })
		: null;
	const movesHost =
		sideCol?.createDiv({ cls: "chess-study-moves-wrap" }) ?? null;

	const buildSteps = (): PositionStep[] => {
		const steps: PositionStep[] = [{ fen: initialFen }];
		const replay = new Chess(initialFen);
		const history = chess.history({ verbose: true });
		for (let i = 0; i < history.length; i++) {
			const m = history[i];
			if (!m) continue;
			const played = replay.move(m.san);
			steps.push({
				fen: replay.fen(),
				san: played.san,
				from: played.from,
				to: played.to,
				color: played.color,
				moveNumber: Math.floor(i / 2) + 1,
				captured: played.captured as PieceType | undefined,
				promotion: played.promotion as PieceType | undefined,
			});
		}
		return steps;
	};

	const drawCapturedTrays = () => {
		if (!showCaptured) {
			topTrayHost.empty();
			bottomTrayHost.empty();
			topTrayHost.classList.add("is-hidden");
			bottomTrayHost.classList.add("is-hidden");
			return;
		}
		const steps = buildSteps();
		const totals = computeCaptured(steps, steps.length - 1);
		topTrayHost.classList.remove("is-hidden");
		bottomTrayHost.classList.remove("is-hidden");
		const bottomColor = orientation === "white" ? "w" : "b";
		const topColor = bottomColor === "w" ? "b" : "w";
		topTrayHost.setAttribute(
			"aria-label",
			topColor === "w"
				? "Pieces captured by White"
				: "Pieces captured by Black"
		);
		bottomTrayHost.setAttribute(
			"aria-label",
			bottomColor === "w"
				? "Pieces captured by White"
				: "Pieces captured by Black"
		);
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

	const drawMoveList = () => {
		if (!movesHost) return;
		const steps = buildSteps();
		renderMoveList(movesHost, {
			steps,
			activeIndex: steps.length - 1,
			pieceSet,
			activeTurn: chess.turn(),
			highlightHeaderTurn: state.kind === "playing",
			onSelect: () => {
				/* Seeking would desync persisted line; list is display-only. */
			},
		});
	};

	const draw = () => {
		const lastMove = chess.history({ verbose: true }).at(-1);
		const selected = state.kind === "playing" ? state.selected : null;
		const legalTargets =
			state.kind === "playing" && selected
				? chess
						.moves({ square: selected, verbose: true })
						.map((m: Move) => m.to)
				: [];

		renderBoard(boardHost, {
			fen: chess.fen(),
			orientation,
			pieceSet,
			lightColor,
			darkColor,
			highlightColor: settings.lastMoveColor,
			coordinateColor: settings.coordinateColor,
			showCoordinates: showCoords,
			from: lastMove?.from,
			to: lastMove?.to,
			selectedSquare: selected ?? undefined,
			legalTargets,
			onSquareClick: (sq) => onSquareClick(sq as Square),
		});
		drawCapturedTrays();
		drawMoveList();
	};

	const onSquareClick = (sq: Square) => {
		if (state.kind !== "playing") return;

		const piece = chess.get(sq);
		const turn = chess.turn();

		if (piece && piece.color === turn) {
			if (state.selected === sq) {
				state = { kind: "playing", selected: null };
			} else {
				state = { kind: "playing", selected: sq };
			}
			draw();
			return;
		}

		const from = state.selected;
		if (!from) return;

		const legal = chess.moves({ square: from, verbose: true });
		const candidates = legal.filter((m: Move) => m.to === sq);
		if (candidates.length === 0) {
			state = { kind: "playing", selected: null };
			draw();
			return;
		}

		const needsPromotion = candidates.some(
			(m: Move) => (m.promotion ?? "") !== ""
		);
		if (needsPromotion) {
			void pickPromotionPiece(app, turn).then((promo) => {
				if (!promo) return;
				applyMove({ from, to: sq, promotion: promo });
			});
			return;
		}

		applyMove({ from, to: sq });
	};

	const applyMove = (move: { from: Square; to: Square; promotion?: string }) => {
		try {
			chess.move(move);
		} catch {
			state = { kind: "playing", selected: null };
			draw();
			return;
		}
		state = { kind: "playing", selected: null };
		checkGameOver();
		draw();
		persist();
	};

	const checkGameOver = () => {
		if (chess.isCheckmate()) {
			const winner = chess.turn() === "w" ? "Black" : "White";
			state = {
				kind: "over",
				reason: `Checkmate — ${winner} wins.`,
			};
			return;
		}
		if (chess.isStalemate()) {
			state = { kind: "over", reason: "Stalemate. Draw." };
			return;
		}
		if (chess.isDraw()) {
			state = { kind: "over", reason: "Draw." };
		}
	};

	const undoOnce = () => {
		if (chess.history().length === 0) return;
		chess.undo();
		state = { kind: "playing", selected: null };
		draw();
		persist();
	};

	const newBoard = () => {
		chess = new Chess(initialFen);
		state = { kind: "playing", selected: null };
		draw();
		void rewriteChessBlock(app, ctx, host, {
			opening: "",
			variation: "",
			endgame: "",
			wccgame: "",
			freeboard: "yes",
			moves: "",
			fen: initialFen !== STANDARD_FEN ? initialFen : "",
		});
	};

	const flip = () => {
		orientation = orientation === "white" ? "black" : "white";
		draw();
	};

	const buildControls = () => {
		controlsHost.empty();
		const make = (label: string, icon: string, onClick: () => void) => {
			const btn = controlsHost.createEl("button", {
				cls: "chess-study-control",
				attr: { "aria-label": label, type: "button", title: label },
			});
			setIcon(btn, icon);
			btn.addEventListener("click", onClick);
			return btn;
		};
		make("Undo last move", "undo", undoOnce);
		make("Reset to start position", "trash-2", newBoard);
		make("Flip board (F)", "refresh-cw", flip);
	};

	layout.addEventListener("keydown", (ev) => {
		if (ev.key !== "f" && ev.key !== "F") return;
		const target = ev.target as HTMLElement | null;
		const tag = target?.tagName ?? "";
		if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
		if (target?.isContentEditable) return;
		ev.preventDefault();
		flip();
	});

	buildControls();
	draw();
}

function chessFromSaved(startFen: string, movesLine: string | undefined): Chess {
	const g = new Chess(startFen);
	for (const san of tokenizeMoves(movesLine ?? "")) {
		try {
			g.move(san);
		} catch {
			break;
		}
	}
	return g;
}
