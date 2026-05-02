import { Chess, type Square, type Move } from "chess.js";
import { App, setIcon } from "obsidian";
import type {
	CaissaSettings,
	ChessBlockConfig,
	Orientation,
	PieceColor,
	PieceType,
} from "../types";
import type { PositionStep } from "../chess/engine";
import { getEngine } from "../chess/engine-worker";
import { renderBoard } from "./board-renderer";
import { renderMoveList } from "./move-list";
import { computeCaptured, hasAnyCaptures } from "../utils/captured-pieces";
import { renderCapturedTray } from "./captured-tray";
import { pickPromotionPiece } from "./promotion-picker";

/**
 * Play-vs-Stockfish controller.
 *
 * Renders its own layout (board + side panel + controls) instead of
 * piggy-backing on the analysis-style stepper, because the lifecycle is
 * fundamentally different: the user is *making* moves, not just stepping
 * a pre-baked sequence. State machine:
 *
 *     awaitingHuman ── clickFriendlyPiece ──► selected
 *     selected      ── clickLegalTarget   ──► (apply move)
 *                                              │
 *                                              └─► awaitingEngine
 *     awaitingEngine ── engine bestmove   ──► (apply move) ──► awaitingHuman
 *     (any)         ── checkmate/draw     ──► gameOver
 *
 * Promotion is handled inline: when a pawn move would land on the last
 * rank, the {@link PromotionPickerModal} prompts the user instead of
 * silently picking a queen.
 */

export interface PlayControllerArgs {
	host: HTMLElement;
	startFen: string;
	humanColor: PieceColor;
	level: number;
	config: ChessBlockConfig;
	settings: CaissaSettings;
	app: App;
}

type PlayState =
	| { kind: "awaitingHuman"; selected: Square | null }
	| { kind: "thinking" }
	| { kind: "gameOver"; reason: string };

export function renderPlayBlock(args: PlayControllerArgs): void {
	const { host, startFen, humanColor, level, config, settings, app } = args;
	host.empty();
	host.classList.add("chess-study-block");

	const orientation: Orientation = humanColor === "w" ? "white" : "black";
	const pieceSet = config.pieces ?? settings.pieceSet;
	const lightColor = config.light ?? settings.lightSquareColor;
	const darkColor = config.dark ?? settings.darkSquareColor;
	const showCoords = config.coordinates ?? settings.showCoordinates;
	const showMoves = config.showMoves ?? true;
	const showCaptured = config.captured ?? settings.showCapturedPieces;
	const size = config.size ?? "medium";
	const skill = Math.max(0, Math.min(level, 20));

	if (config.title) {
		host.createDiv({ cls: "chess-study-title", text: config.title });
	}

	const layout = host.createDiv({
		cls: `chess-study-layout size-${size}${showMoves ? "" : " no-moves"}`,
		attr: {
			tabindex: "0",
			role: "group",
			"aria-label": `Play vs Stockfish (skill ${skill}). Click a piece, then click its destination.`,
		},
	});

	const boardCol = layout.createDiv({ cls: "chess-study-board-col" });
	const topTrayHost = boardCol.createDiv({
		cls: "chess-study-captured-wrap chess-study-captured-top",
	});
	const boardHost = boardCol.createDiv({ cls: "chess-study-board-wrap" });
	const bottomTrayHost = boardCol.createDiv({
		cls: "chess-study-captured-wrap chess-study-captured-bottom",
	});
	const statusHost = boardCol.createDiv({ cls: "chess-study-play-status" });
	const controlsHost = boardCol.createDiv({
		cls: "chess-study-controls chess-study-play-controls",
	});

	const sideCol = showMoves
		? layout.createDiv({ cls: "chess-study-side-col" })
		: null;
	const movesHost =
		sideCol?.createDiv({ cls: "chess-study-moves-wrap" }) ?? null;

	let chess = new Chess(startFen);
	let state: PlayState = { kind: "awaitingHuman", selected: null };
	let abortController: AbortController | null = null;

	const buildSteps = (): PositionStep[] => {
		const steps: PositionStep[] = [{ fen: startFen }];
		const replay = new Chess(startFen);
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

	const draw = () => {
		const lastMove = chess.history({ verbose: true }).at(-1);
		const selected =
			state.kind === "awaitingHuman" ? state.selected : null;
		const legalTargets = selected
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
		drawStatus();
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
		if (!hasAnyCaptures(totals)) {
			topTrayHost.empty();
			bottomTrayHost.empty();
			topTrayHost.classList.add("is-hidden");
			bottomTrayHost.classList.add("is-hidden");
			return;
		}
		topTrayHost.classList.remove("is-hidden");
		bottomTrayHost.classList.remove("is-hidden");
		const bottomColor: PieceColor = humanColor;
		const topColor: PieceColor = humanColor === "w" ? "b" : "w";
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
			showAdvantage: true,
		});
		renderCapturedTray(bottomTrayHost, {
			color: bottomColor,
			totals,
			pieceSet,
			showAdvantage: true,
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
			onSelect: () => {
				/* clicking moves doesn't seek mid-game (would diverge
				   from the current position); kept passive on purpose. */
			},
		});
	};

	const drawStatus = () => {
		statusHost.empty();
		const turn = chess.turn();
		if (state.kind === "gameOver") {
			statusHost.createSpan({
				cls: "chess-study-play-status-text is-gameover",
				text: state.reason,
			});
			return;
		}
		if (state.kind === "thinking") {
			statusHost.createSpan({
				cls: "chess-study-play-status-text is-thinking",
				text: `Stockfish (skill ${skill}) is thinking…`,
			});
			return;
		}
		const youMove = turn === humanColor;
		const inCheck = chess.inCheck();
		const text = youMove
			? inCheck
				? "Your move — you're in check."
				: "Your move."
			: "Engine to move.";
		statusHost.createSpan({
			cls: "chess-study-play-status-text",
			text,
		});
	};

	const onSquareClick = (sq: Square) => {
		if (state.kind !== "awaitingHuman") return;
		if (chess.turn() !== humanColor) return;

		const piece = chess.get(sq);
		// Selecting a friendly piece (or re-selecting) just changes which
		// square is "picked up". Clicking the same square again deselects.
		if (piece && piece.color === humanColor) {
			if (state.selected === sq) {
				state = { kind: "awaitingHuman", selected: null };
			} else {
				state = { kind: "awaitingHuman", selected: sq };
			}
			draw();
			return;
		}

		// Otherwise we're attempting a move from the current selection.
		const from = state.selected;
		if (!from) return;

		const legal = chess.moves({ square: from, verbose: true });
		const candidates = legal.filter((m: Move) => m.to === sq);
		if (candidates.length === 0) {
			// Off-target click — deselect (matches Lichess behavior).
			state = { kind: "awaitingHuman", selected: null };
			draw();
			return;
		}

		const needsPromotion = candidates.some(
			(m: Move) => (m.promotion ?? "") !== ""
		);
		if (needsPromotion) {
			void pickPromotionPiece(app, humanColor).then((piece) => {
				if (!piece) return;
				applyMove({ from, to: sq, promotion: piece });
			});
			return;
		}

		applyMove({ from, to: sq });
	};

	const applyMove = (move: { from: Square; to: Square; promotion?: string }) => {
		try {
			chess.move(move);
		} catch {
			state = { kind: "awaitingHuman", selected: null };
			draw();
			return;
		}
		state = { kind: "awaitingHuman", selected: null };
		draw();
		afterMove();
	};

	const afterMove = () => {
		if (checkAndSetGameOver()) {
			draw();
			return;
		}
		if (chess.turn() !== humanColor) {
			void requestEngineMove();
		}
	};

	const requestEngineMove = async () => {
		state = { kind: "thinking" };
		draw();
		abortController?.abort();
		abortController = new AbortController();
		const signal = abortController.signal;

		try {
			const uci = await getEngine().findBestMove(chess.fen(), {
				skillLevel: skill,
				signal,
			});
			if (signal.aborted) return;
			if (!uci) {
				checkAndSetGameOver();
				draw();
				return;
			}
			const from = uci.slice(0, 2) as Square;
			const to = uci.slice(2, 4) as Square;
			const promotion = uci.length >= 5 ? uci.slice(4, 5) : undefined;
			try {
				chess.move({ from, to, promotion });
			} catch {
				// Engine returned an illegal move — shouldn't happen, but
				// don't blow up the board if it does.
			}
			state = { kind: "awaitingHuman", selected: null };
			checkAndSetGameOver();
			draw();
		} catch (err) {
			state = {
				kind: "gameOver",
				reason: `Engine error: ${(err as Error).message}`,
			};
			draw();
		}
	};

	const checkAndSetGameOver = (): boolean => {
		if (chess.isCheckmate()) {
			const winner = chess.turn() === "w" ? "Black" : "White";
			state = {
				kind: "gameOver",
				reason: `Checkmate — ${winner} wins.`,
			};
			return true;
		}
		if (chess.isStalemate()) {
			state = { kind: "gameOver", reason: "Stalemate. Draw." };
			return true;
		}
		if (chess.isThreefoldRepetition()) {
			state = {
				kind: "gameOver",
				reason: "Draw by threefold repetition.",
			};
			return true;
		}
		if (chess.isInsufficientMaterial()) {
			state = {
				kind: "gameOver",
				reason: "Draw by insufficient material.",
			};
			return true;
		}
		if (chess.isDraw()) {
			state = { kind: "gameOver", reason: "Draw (50-move rule)." };
			return true;
		}
		return false;
	};

	const newGame = () => {
		abortController?.abort();
		chess = new Chess(startFen);
		state = { kind: "awaitingHuman", selected: null };
		draw();
		// If the human plays black, the engine moves first.
		if (chess.turn() !== humanColor) {
			void requestEngineMove();
		}
	};

	const undoOnce = () => {
		// Roll back the last full pair (engine's reply + your move) so
		// the board returns to a position where you're on move again.
		if (state.kind === "thinking") return;
		abortController?.abort();
		const history = chess.history({ verbose: true });
		if (history.length === 0) return;
		const last = history[history.length - 1];
		const popN = last && last.color === humanColor ? 1 : 2;
		for (let i = 0; i < popN; i++) chess.undo();
		state = { kind: "awaitingHuman", selected: null };
		draw();
	};

	const buildControls = () => {
		controlsHost.empty();
		const make = (
			label: string,
			icon: string,
			onClick: () => void
		) => {
			const btn = controlsHost.createEl("button", {
				cls: "chess-study-control",
				attr: { "aria-label": label, type: "button", title: label },
			});
			setIcon(btn, icon);
			btn.addEventListener("click", onClick);
			return btn;
		};
		make("Undo your last move", "rotate-ccw", undoOnce);
		make("New game", "refresh-cw", newGame);
	};

	buildControls();
	draw();

	// If the human plays black, kick off the engine so it makes the
	// first move.
	if (chess.turn() !== humanColor) {
		void requestEngineMove();
	}
}
