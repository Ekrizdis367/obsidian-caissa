import type { AnalysisResult, EngineLine } from "../chess/engine-worker";
import { getEngine } from "../chess/engine-worker";
import { fenInfo } from "./lines-panel";

/**
 * Lazily-mounted Stockfish analysis panel: an evaluation bar plus the
 * top-N principal variations for the current position.
 *
 * Lifecycle is owned by the chess block:
 *   1. The block calls {@link createAnalysisController} once on mount.
 *   2. On every position change (step/flip) it calls `controller.update(fen)`.
 *   3. On dispose it calls `controller.destroy()` to abort any in-flight
 *      search and detach DOM. The shared engine worker keeps running so
 *      subsequent blocks don't pay the spin-up cost again.
 */

export interface AnalysisController {
	update(fen: string): void;
	destroy(): void;
}

export interface AnalysisOptions {
	depth?: number;
	multiPV?: number;
}

export function createAnalysisController(
	host: HTMLElement,
	opts: AnalysisOptions = {}
): AnalysisController {
	host.empty();
	host.classList.add("chess-study-analysis");

	const bar = host.createDiv({ cls: "chess-study-eval-bar" });
	const fillWhite = bar.createDiv({ cls: "chess-study-eval-fill is-white" });
	const fillBlack = bar.createDiv({ cls: "chess-study-eval-fill is-black" });
	const label = bar.createDiv({ cls: "chess-study-eval-label", text: "0.0" });

	const linesEl = host.createDiv({ cls: "chess-study-engine-lines" });
	linesEl.createDiv({
		cls: "chess-study-engine-loading",
		text: "Loading engine…",
	});

	let abortController: AbortController | null = null;
	let destroyed = false;

	const update = (fen: string) => {
		if (destroyed) return;
		abortController?.abort();
		abortController = new AbortController();
		const myAbort = abortController;

		linesEl.empty();
		linesEl.createDiv({
			cls: "chess-study-engine-loading",
			text: "Analyzing…",
		});

		void getEngine()
			.analyze(fen, {
				depth: opts.depth ?? 16,
				multiPV: opts.multiPV ?? 3,
				signal: myAbort.signal,
			})
			.then((res) => {
				if (destroyed || myAbort.signal.aborted) return;
				renderAnalysis(linesEl, fillWhite, fillBlack, label, res, fen);
			})
			.catch((err) => {
				if (destroyed) return;
				linesEl.empty();
				linesEl.createDiv({
					cls: "chess-study-engine-error",
					text: `Engine error: ${(err as Error).message}`,
				});
			});
	};

	const destroy = () => {
		destroyed = true;
		abortController?.abort();
		abortController = null;
		host.empty();
	};

	return { update, destroy };
}

function renderAnalysis(
	linesEl: HTMLElement,
	fillWhite: HTMLElement,
	fillBlack: HTMLElement,
	label: HTMLElement,
	res: AnalysisResult,
	fen: string
): void {
	linesEl.empty();
	if (res.lines.length === 0) {
		linesEl.createDiv({
			cls: "chess-study-engine-empty",
			text: "No analysis available.",
		});
		updateEvalBar(fillWhite, fillBlack, label, null, null, "w");
		return;
	}

	const top = res.lines[0];
	if (!top) return;
	const { fullMoveNumber, turn } = fenInfo(fen);
	updateEvalBar(fillWhite, fillBlack, label, top.cp, top.mate, turn);

	for (const line of res.lines) {
		renderLineRow(linesEl, line, fullMoveNumber, turn);
	}
}

function renderLineRow(
	host: HTMLElement,
	line: EngineLine,
	startFullMove: number,
	turn: "w" | "b"
): void {
	const row = host.createDiv({ cls: "chess-study-engine-line" });
	row.createSpan({
		cls: "chess-study-engine-eval",
		text: formatScore(line.cp, line.mate, turn),
	});
	row.createSpan({
		cls: "chess-study-engine-depth",
		text: `d${line.depth}`,
	});
	row.createSpan({
		cls: "chess-study-engine-pv",
		text: formatPv(line.pv, startFullMove, turn),
	});
}

/**
 * Format the engine's score from the side-to-move's perspective, then
 * flip the sign so the printed value is always from White's perspective
 * (e.g. "+1.20" = White is up, "-0.40" = Black is up). Mate scores are
 * always shown as #N from White's POV too.
 */
function formatScore(
	cp: number | null,
	mate: number | null,
	turn: "w" | "b"
): string {
	if (mate !== null) {
		const fromWhite = turn === "w" ? mate : -mate;
		const sign = fromWhite > 0 ? "+" : "-";
		return `${sign}M${Math.abs(fromWhite)}`;
	}
	if (cp !== null) {
		const fromWhite = (turn === "w" ? cp : -cp) / 100;
		const sign = fromWhite >= 0 ? "+" : "";
		return `${sign}${fromWhite.toFixed(2)}`;
	}
	return "0.00";
}

/**
 * Format a UCI principal variation as a human-readable move list, e.g.
 *   1. e4 e5 2. Nf3 Nc6 ...
 *
 * We don't have a chess.js instance here, so we fall back to printing
 * raw UCI moves. This is fine for analysis output where positions update
 * faster than a human reads — clarity beats SAN for quick scanning.
 */
function formatPv(pv: string[], startFullMove: number, turn: "w" | "b"): string {
	const out: string[] = [];
	let move = startFullMove;
	let side: "w" | "b" = turn;
	for (let i = 0; i < pv.length; i++) {
		const tok = pv[i];
		if (!tok) continue;
		if (side === "w") {
			out.push(`${move}.`);
		} else if (i === 0) {
			out.push(`${move}...`);
		}
		out.push(tok);
		if (side === "b") move++;
		side = side === "w" ? "b" : "w";
	}
	return out.join(" ");
}

/**
 * Update the eval bar fill ratios. We clamp to ~5 pawns so a single
 * blunder doesn't peg the bar — the numeric label still shows the true
 * value.
 */
function updateEvalBar(
	fillWhite: HTMLElement,
	fillBlack: HTMLElement,
	label: HTMLElement,
	cp: number | null,
	mate: number | null,
	turn: "w" | "b"
): void {
	let whitePct = 50;
	let labelText = "0.00";

	if (mate !== null) {
		const fromWhite = turn === "w" ? mate : -mate;
		whitePct = fromWhite > 0 ? 100 : 0;
		labelText = `${fromWhite > 0 ? "+" : "-"}M${Math.abs(fromWhite)}`;
	} else if (cp !== null) {
		const pawnsFromWhite = (turn === "w" ? cp : -cp) / 100;
		const clamped = Math.max(-5, Math.min(5, pawnsFromWhite));
		whitePct = 50 + (clamped / 5) * 50;
		const sign = pawnsFromWhite >= 0 ? "+" : "";
		labelText = `${sign}${pawnsFromWhite.toFixed(2)}`;
	}

	fillWhite.style.height = `${whitePct}%`;
	fillBlack.style.height = `${100 - whitePct}%`;
	label.setText(labelText);
}
