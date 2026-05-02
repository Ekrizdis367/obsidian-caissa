import { App, Modal, setIcon } from "obsidian";
import { Chess } from "chess.js";
import type { CaissaSettings, Opening, OpeningVariation } from "../types";
import { OPENINGS } from "../chess/openings";
import { renderBoard } from "./board-renderer";

interface QuizPosition {
	opening: Opening;
	variation: OpeningVariation | null;
	/** SAN tokens for the full line. */
	moves: string[];
	/** How many moves have already been played; user is asked for `moves[depth]`. */
	depth: number;
}

interface QuizState {
	score: number;
	asked: number;
	streak: number;
	bestStreak: number;
	answered: boolean;
}

/**
 * "Rolling openings quiz" — a self-contained modal that endlessly serves up
 * positions from the bundled opening repertoire and asks the user for the
 * next book move.
 *
 * Design notes:
 *
 *   - Positions are sampled from the union of every opening + every variation
 *     in {@link OPENINGS}, so deeper variations get more questions per round.
 *   - We keep a tiny `recent` window so the same exact (opening, variation,
 *     depth) tuple doesn't get asked twice in a row.
 *   - Move validation goes through chess.js so we accept any legal SAN
 *     spelling (`Nf3`, `Ngf3`, `N1f3`, etc.) — but only the *exact* expected
 *     SAN from the repertoire counts as the right answer.
 *   - Score is per-session only — never persisted. The point is reps, not
 *     a leaderboard.
 */
export class OpeningsQuizModal extends Modal {
	private settings: CaissaSettings;
	private current: QuizPosition | null = null;
	private state: QuizState = {
		score: 0,
		asked: 0,
		streak: 0,
		bestStreak: 0,
		answered: false,
	};
	private recent: string[] = [];
	private boardHost!: HTMLElement;
	private promptEl!: HTMLElement;
	private feedbackEl!: HTMLElement;
	private revealEl!: HTMLElement;
	private input!: HTMLInputElement;
	private submitBtn!: HTMLButtonElement;
	private nextBtn!: HTMLButtonElement;
	private scoreEl!: HTMLElement;

	constructor(app: App, settings: CaissaSettings) {
		super(app);
		this.settings = settings;
	}

	onOpen(): void {
		this.modalEl.addClass("chess-study-quiz-modal");
		this.contentEl.empty();

		this.contentEl.createEl("h2", { text: "Openings quiz" });
		this.contentEl.createDiv({
			cls: "chess-study-quiz-help",
			text:
				"A position from a known opening will appear. Type the next book move (e.g. e4, Nf3, O-O) and press Enter.",
		});

		this.scoreEl = this.contentEl.createDiv({
			cls: "chess-study-quiz-score",
		});

		this.boardHost = this.contentEl.createDiv({
			cls: "chess-study-quiz-board",
		});

		this.promptEl = this.contentEl.createDiv({
			cls: "chess-study-quiz-prompt",
		});

		const inputRow = this.contentEl.createDiv({
			cls: "chess-study-quiz-input-row",
		});
		this.input = inputRow.createEl("input", {
			type: "text",
			cls: "chess-study-quiz-input",
			attr: {
				placeholder: "Your move",
				autocomplete: "off",
				spellcheck: "false",
			},
		});
		this.input.addEventListener("keydown", (ev) => {
			if (ev.key === "Enter") {
				ev.preventDefault();
				if (this.state.answered) {
					this.next();
				} else {
					this.submit();
				}
			}
		});

		this.submitBtn = inputRow.createEl("button", {
			cls: "mod-cta chess-study-quiz-submit",
			text: "Submit",
		});
		this.submitBtn.addEventListener("click", () => this.submit());

		this.nextBtn = inputRow.createEl("button", {
			cls: "chess-study-quiz-next is-hidden",
			text: "Next position",
		});
		this.nextBtn.addEventListener("click", () => this.next());

		this.feedbackEl = this.contentEl.createDiv({
			cls: "chess-study-quiz-feedback",
		});
		this.revealEl = this.contentEl.createDiv({
			cls: "chess-study-quiz-reveal",
		});

		this.next();
	}

	private next(): void {
		this.state.answered = false;
		this.feedbackEl.empty();
		this.feedbackEl.removeClass("is-correct");
		this.feedbackEl.removeClass("is-incorrect");
		this.revealEl.empty();
		this.input.disabled = false;
		this.input.value = "";
		this.submitBtn.removeClass("is-hidden");
		this.nextBtn.addClass("is-hidden");

		this.current = pickQuizPosition(this.recent);
		this.recordRecent(this.current);

		const fen = computeFenAtDepth(this.current.moves, this.current.depth);
		const sideToMove =
			fen.split(" ")[1] === "b" ? "Black" : "White";
		const moveNumber = Math.floor(this.current.depth / 2) + 1;
		const moveLabel =
			sideToMove === "White"
				? `${moveNumber}.`
				: `${moveNumber}…`;

		renderBoard(this.boardHost, {
			fen,
			orientation: sideToMove === "White" ? "white" : "black",
			pieceSet: this.settings.pieceSet,
			lightColor: this.settings.lightSquareColor,
			darkColor: this.settings.darkSquareColor,
			highlightColor: this.settings.lastMoveColor,
			coordinateColor: this.settings.coordinateColor,
			showCoordinates: this.settings.showCoordinates,
		});

		this.promptEl.empty();
		this.promptEl.createSpan({
			cls: "chess-study-quiz-side",
			text: `${moveLabel} ${sideToMove} to move`,
		});
		this.promptEl.createSpan({
			cls: "chess-study-quiz-mystery",
			text: " · what's the book move?",
		});

		this.input.focus();
		this.renderScore();
	}

	private submit(): void {
		if (!this.current || this.state.answered) return;

		const raw = this.input.value.trim();
		if (!raw) {
			this.input.focus();
			return;
		}

		const expected = this.current.moves[this.current.depth];
		if (!expected) return;

		const fen = computeFenAtDepth(this.current.moves, this.current.depth);
		const verdict = checkAnswer(fen, raw, expected);

		this.state.answered = true;
		this.state.asked++;
		this.input.disabled = true;
		this.submitBtn.addClass("is-hidden");
		this.nextBtn.removeClass("is-hidden");
		this.nextBtn.focus();

		if (verdict.correct) {
			this.state.score++;
			this.state.streak++;
			if (this.state.streak > this.state.bestStreak) {
				this.state.bestStreak = this.state.streak;
			}
			this.feedbackEl.addClass("is-correct");
			const playedSan = verdict.playedSan ?? expected;
			this.feedbackEl.createSpan({ text: `Correct — ${playedSan}` });
		} else {
			this.state.streak = 0;
			this.feedbackEl.addClass("is-incorrect");
			if (verdict.playedSan) {
				this.feedbackEl.createSpan({
					text: `Not the book move. You played ${verdict.playedSan}; expected ${expected}.`,
				});
			} else {
				this.feedbackEl.createSpan({
					text: `Illegal move "${raw}". Expected ${expected}.`,
				});
			}
		}

		const labelParts: string[] = [this.current.opening.name];
		if (this.current.variation) {
			labelParts.push(this.current.variation.name);
		}
		this.revealEl.createSpan({
			cls: "chess-study-quiz-reveal-label",
			text: `From: ${labelParts.join(" — ")}`,
		});

		this.renderScore();
	}

	private renderScore(): void {
		this.scoreEl.empty();
		const span = this.scoreEl.createSpan();
		setIcon(span, "trophy");
		this.scoreEl.createSpan({
			text: ` ${this.state.score} / ${this.state.asked}`,
		});
		if (this.state.bestStreak > 0) {
			this.scoreEl.createSpan({
				cls: "chess-study-quiz-streak",
				text: `  ·  streak ${this.state.streak} (best ${this.state.bestStreak})`,
			});
		}
	}

	private recordRecent(pos: QuizPosition): void {
		const key = quizKey(pos);
		this.recent.push(key);
		if (this.recent.length > 8) this.recent.shift();
	}
}

interface AnswerVerdict {
	correct: boolean;
	playedSan?: string;
}

/**
 * Validate the user's input against the expected SAN. We rely on chess.js
 * to canonicalize SAN, which both makes the comparison robust to spelling
 * variants (`Nf3` vs `Ngf3` when only one knight reaches f3) and rejects
 * outright illegal moves with a helpful failure mode.
 */
function checkAnswer(
	fen: string,
	rawInput: string,
	expectedSan: string
): AnswerVerdict {
	const cleaned = rawInput
		.replace(/^\d+\.\s*/, "")
		.replace(/^\d+\.\.\.?\s*/, "")
		.trim();

	const chess = new Chess(fen);
	let played: ReturnType<typeof chess.move> | null = null;
	try {
		played = chess.move(cleaned);
	} catch {
		// Fall through; played stays null.
	}

	if (!played) {
		return { correct: false };
	}

	// Compare canonical SAN — chess.js will return e.g. "Nf3" even if user
	// typed "Ngf3", so we re-derive the expected canonical SAN by playing
	// it on a fresh board and comparing the two.
	const expectedChess = new Chess(fen);
	let expectedMove: ReturnType<typeof expectedChess.move> | null = null;
	try {
		expectedMove = expectedChess.move(expectedSan);
	} catch {
		// shouldn't happen — repertoire moves are pre-validated
	}
	const expectedCanonical = expectedMove?.san ?? expectedSan;

	return {
		correct: played.san === expectedCanonical,
		playedSan: played.san,
	};
}

function quizKey(pos: QuizPosition): string {
	const v = pos.variation ? pos.variation.name : "";
	return `${pos.opening.name}|${v}|${pos.depth}`;
}

/**
 * Build the flat catalog of (opening, variation?, moves) entries we sample
 * from. Done lazily and cached on first use because the opening list is
 * stable for the life of the plugin.
 */
let CATALOG: Array<{
	opening: Opening;
	variation: OpeningVariation | null;
	moves: string[];
}> | null = null;

function getCatalog(): Array<{
	opening: Opening;
	variation: OpeningVariation | null;
	moves: string[];
}> {
	if (CATALOG) return CATALOG;
	const out: Array<{
		opening: Opening;
		variation: OpeningVariation | null;
		moves: string[];
	}> = [];
	for (const op of OPENINGS) {
		const baseMoves = tokenize(op.moves);
		if (baseMoves.length > 0) {
			out.push({ opening: op, variation: null, moves: baseMoves });
		}
		for (const v of op.variations ?? []) {
			const m = tokenize(v.moves);
			if (m.length > 0) {
				out.push({ opening: op, variation: v, moves: m });
			}
		}
	}
	CATALOG = out;
	return out;
}

function pickQuizPosition(recent: string[]): QuizPosition {
	const catalog = getCatalog();
	for (let attempt = 0; attempt < 12; attempt++) {
		const entry = catalog[Math.floor(Math.random() * catalog.length)];
		if (!entry) continue;
		// Pick a depth in [0, moves.length-1] so we always have a "next" move.
		const depth = Math.floor(Math.random() * entry.moves.length);
		const candidate: QuizPosition = {
			opening: entry.opening,
			variation: entry.variation,
			moves: entry.moves,
			depth,
		};
		if (!recent.includes(quizKey(candidate))) return candidate;
	}
	// All recent — fall back to the last attempt regardless.
	const fallback = catalog[Math.floor(Math.random() * catalog.length)] ?? catalog[0];
	return {
		opening: fallback?.opening as Opening,
		variation: fallback?.variation ?? null,
		moves: fallback?.moves ?? [],
		depth: 0,
	};
}

function computeFenAtDepth(moves: string[], depth: number): string {
	const chess = new Chess();
	for (let i = 0; i < depth; i++) {
		const san = moves[i];
		if (!san) break;
		try {
			chess.move(san);
		} catch {
			// Malformed repertoire entry — bail with whatever position we got.
			break;
		}
	}
	return chess.fen();
}

function tokenize(moves: string): string[] {
	return moves
		.replace(/\b\d+\.(\.\.)?/g, " ")
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}
