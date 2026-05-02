import type { PositionStep } from "../chess/engine";
import { getEngine } from "../chess/engine-worker";

/**
 * Eval graph: an SVG sparkline of Stockfish's centipawn evaluation across
 * every position in the loaded game. Hidden behind an "Analyze game"
 * button so we never run the engine over an entire game without the
 * user opting in (analyzing 80 positions at depth 14 is non-trivial).
 *
 * Click anywhere on the graph to jump the board to the closest position.
 *
 * The controller exposes `setActiveIndex` so the chess block can keep the
 * cursor on the graph in sync with stepping/clicking through moves.
 */

export interface EvalGraphArgs {
	steps: PositionStep[];
	onJumpTo: (index: number) => void;
}

export interface EvalGraphController {
	setActiveIndex(index: number): void;
	destroy(): void;
}

interface EvalPoint {
	index: number;
	/** Centipawns from White's perspective (clamped at ±1500). null = mate. */
	cp: number | null;
	mate: number | null;
}

const GRAPH_WIDTH = 600;
const GRAPH_HEIGHT = 80;
const PADDING_Y = 6;
const CLAMP_CP = 800;

export function createEvalGraphController(
	host: HTMLElement,
	args: EvalGraphArgs
): EvalGraphController {
	host.empty();
	host.classList.add("chess-study-eval-graph");

	const header = host.createDiv({ cls: "chess-study-eval-graph-header" });
	header.createSpan({
		cls: "chess-study-eval-graph-title",
		text: "Evaluation",
	});
	const button = header.createEl("button", {
		cls: "chess-study-eval-graph-btn",
		text: "Analyze game",
		attr: { type: "button" },
	});
	const status = header.createSpan({
		cls: "chess-study-eval-graph-status",
		text: "",
	});

	const graphHost = host.createDiv({ cls: "chess-study-eval-graph-canvas" });

	let abortController: AbortController | null = null;
	let destroyed = false;
	let evals: EvalPoint[] = [];
	let activeIndex = 0;
	let svg: SVGSVGElement | null = null;
	let cursor: SVGLineElement | null = null;

	const render = () => {
		graphHost.empty();
		svg = drawGraph(graphHost, evals, args.steps.length, activeIndex);
		cursor = svg.querySelector(".chess-study-eval-graph-cursor");
		svg.addEventListener("click", (ev) => {
			if (!svg) return;
			const rect = svg.getBoundingClientRect();
			if (rect.width === 0) return;
			const ratio = (ev.clientX - rect.left) / rect.width;
			const idx = Math.max(
				0,
				Math.min(
					args.steps.length - 1,
					Math.round(ratio * (args.steps.length - 1))
				)
			);
			args.onJumpTo(idx);
		});
	};

	const updateCursor = () => {
		if (!cursor || args.steps.length <= 1) return;
		const x =
			(activeIndex / (args.steps.length - 1)) * GRAPH_WIDTH;
		cursor.setAttribute("x1", String(x));
		cursor.setAttribute("x2", String(x));
	};

	const runAnalysis = async () => {
		if (destroyed) return;
		button.setAttribute("disabled", "true");
		button.setText("Analyzing…");
		abortController?.abort();
		abortController = new AbortController();

		try {
			evals = await analyzeGame(
				args.steps,
				abortController.signal,
				(done, total) => {
					if (destroyed) return;
					status.setText(`${done}/${total}`);
				}
			);
			if (destroyed) return;
			status.setText(`${evals.length} positions`);
			button.setText("Re-analyze");
			button.removeAttribute("disabled");
			render();
		} catch (err) {
			if (destroyed) return;
			button.removeAttribute("disabled");
			button.setText("Analyze game");
			status.setText(`Error: ${(err as Error).message}`);
		}
	};

	button.addEventListener("click", () => {
		void runAnalysis();
	});

	return {
		setActiveIndex(idx) {
			activeIndex = idx;
			updateCursor();
		},
		destroy() {
			destroyed = true;
			abortController?.abort();
			abortController = null;
			host.empty();
		},
	};
}

/**
 * Run the engine on every position sequentially, reporting progress.
 * Sequential (not parallel) because we share a single Stockfish worker;
 * shallow depth (12) keeps total time tolerable for a typical game.
 */
async function analyzeGame(
	steps: PositionStep[],
	signal: AbortSignal,
	onProgress: (done: number, total: number) => void
): Promise<EvalPoint[]> {
	const out: EvalPoint[] = [];
	const engine = getEngine();
	for (let i = 0; i < steps.length; i++) {
		if (signal.aborted) break;
		const step = steps[i];
		if (!step) continue;
		const fen = step.fen;
		const res = await engine.analyze(fen, { depth: 12, multiPV: 1, signal });
		const top = res.lines[0];
		if (!top) {
			out.push({ index: i, cp: null, mate: null });
		} else {
			const turn = fen.split(" ")[1] === "w" ? "w" : "b";
			const cpFromWhite =
				top.cp === null
					? null
					: turn === "w"
					? top.cp
					: -top.cp;
			const mateFromWhite =
				top.mate === null
					? null
					: turn === "w"
					? top.mate
					: -top.mate;
			out.push({
				index: i,
				cp: cpFromWhite,
				mate: mateFromWhite,
			});
		}
		onProgress(i + 1, steps.length);
	}
	return out;
}

/**
 * Draw the eval sparkline as an inline SVG. Positions with no evaluation
 * yet are rendered as a flat line at 0 so the graph still has a shape;
 * mate scores are clamped to the chart edges so a single mate doesn't
 * obliterate the rest of the curve.
 */
function drawGraph(
	host: HTMLElement,
	evals: EvalPoint[],
	totalSteps: number,
	activeIndex: number
): SVGSVGElement {
	const svgNs = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNs, "svg");
	svg.setAttribute("class", "chess-study-eval-graph-svg");
	svg.setAttribute("viewBox", `0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`);
	svg.setAttribute("preserveAspectRatio", "none");
	host.appendChild(svg);

	const bg = document.createElementNS(svgNs, "rect");
	bg.setAttribute("x", "0");
	bg.setAttribute("y", "0");
	bg.setAttribute("width", String(GRAPH_WIDTH));
	bg.setAttribute("height", String(GRAPH_HEIGHT));
	bg.setAttribute("fill", "var(--background-secondary)");
	svg.appendChild(bg);

	// Midline (eval = 0).
	const mid = document.createElementNS(svgNs, "line");
	mid.setAttribute("x1", "0");
	mid.setAttribute("x2", String(GRAPH_WIDTH));
	mid.setAttribute("y1", String(GRAPH_HEIGHT / 2));
	mid.setAttribute("y2", String(GRAPH_HEIGHT / 2));
	mid.setAttribute("stroke", "var(--background-modifier-border)");
	mid.setAttribute("stroke-width", "1");
	svg.appendChild(mid);

	if (evals.length === 0 || totalSteps <= 1) {
		const empty = document.createElementNS(svgNs, "text");
		empty.setAttribute("x", String(GRAPH_WIDTH / 2));
		empty.setAttribute("y", String(GRAPH_HEIGHT / 2 + 4));
		empty.setAttribute("text-anchor", "middle");
		empty.setAttribute("fill", "var(--text-muted)");
		empty.setAttribute("font-size", "11");
		empty.textContent =
			evals.length === 0
				? "Click \"Analyze game\" to evaluate every position."
				: "Not enough positions to graph.";
		svg.appendChild(empty);
		const cursor = makeCursor(svgNs);
		svg.appendChild(cursor);
		return svg;
	}

	const points = evals.map((p) => {
		const x = (p.index / (totalSteps - 1)) * GRAPH_WIDTH;
		const y = scoreToY(p);
		return { x, y };
	});

	// Filled area (positive above midline = white advantage).
	const path = document.createElementNS(svgNs, "path");
	const d = buildAreaPath(points);
	path.setAttribute("d", d);
	path.setAttribute("fill", "var(--text-accent)");
	path.setAttribute("fill-opacity", "0.25");
	svg.appendChild(path);

	const stroke = document.createElementNS(svgNs, "polyline");
	stroke.setAttribute(
		"points",
		points.map((p) => `${p.x},${p.y}`).join(" ")
	);
	stroke.setAttribute("fill", "none");
	stroke.setAttribute("stroke", "var(--text-accent)");
	stroke.setAttribute("stroke-width", "1.5");
	svg.appendChild(stroke);

	const cursor = makeCursor(svgNs);
	const cx = (activeIndex / (totalSteps - 1)) * GRAPH_WIDTH;
	cursor.setAttribute("x1", String(cx));
	cursor.setAttribute("x2", String(cx));
	svg.appendChild(cursor);

	return svg;
}

function makeCursor(_svgNs: string): SVGLineElement {
	const cursor = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"line"
	);
	cursor.setAttribute("class", "chess-study-eval-graph-cursor");
	cursor.setAttribute("x1", "0");
	cursor.setAttribute("x2", "0");
	cursor.setAttribute("y1", "0");
	cursor.setAttribute("y2", String(GRAPH_HEIGHT));
	cursor.setAttribute("stroke", "var(--interactive-accent)");
	cursor.setAttribute("stroke-width", "1.5");
	cursor.setAttribute("stroke-dasharray", "3 2");
	return cursor;
}

function buildAreaPath(points: { x: number; y: number }[]): string {
	if (points.length === 0) return "";
	const first = points[0];
	const last = points[points.length - 1];
	if (!first || !last) return "";
	const mid = GRAPH_HEIGHT / 2;
	const parts = [`M ${first.x} ${mid}`];
	for (const p of points) parts.push(`L ${p.x} ${p.y}`);
	parts.push(`L ${last.x} ${mid}`);
	parts.push("Z");
	return parts.join(" ");
}

function scoreToY(p: EvalPoint): number {
	const inner = GRAPH_HEIGHT - PADDING_Y * 2;
	const mid = GRAPH_HEIGHT / 2;
	if (p.mate !== null) {
		return p.mate > 0 ? PADDING_Y : GRAPH_HEIGHT - PADDING_Y;
	}
	if (p.cp === null) return mid;
	const clamped = Math.max(-CLAMP_CP, Math.min(CLAMP_CP, p.cp));
	const ratio = clamped / CLAMP_CP;
	return mid - (ratio * inner) / 2;
}
