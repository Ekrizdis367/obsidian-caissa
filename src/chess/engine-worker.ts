import engineSource from "../vendor/stockfish-engine.sftext";

/**
 * Bundled-Stockfish (v10 asm.js, ~1.5MB inlined) wrapper.
 *
 * We don't ship Stockfish as a separate file because Obsidian plugin
 * installs only sync `main.js`/`manifest.json`/`styles.css` to the vault
 * and reading vendored vault files for Worker bootstrap is fragile across
 * desktop and mobile. Inlining as a string and spawning the worker from a
 * Blob URL keeps everything self-contained.
 *
 * This is pure asm.js (no WASM), so:
 *   - No CSP issues with WebAssembly.compile / wasm-eval
 *   - Works in Electron and on mobile
 *   - Strength is ~3000+ ELO at depth 18 (HCE, no NNUE) — plenty for
 *     analysis-style use cases (eval bar, top lines, blunder detection)
 *
 * Module-level singleton: only one engine is alive at a time. That's fine
 * because Stockfish is single-threaded and serializing analyses through
 * one engine matches the user's mental model (one position analyzed at a
 * time per board, latest request wins).
 */

export interface EngineLine {
	/** 1-indexed PV rank (1 = top line). */
	multipv: number;
	/** Centipawn evaluation from White's perspective. */
	cp: number | null;
	/** Mate distance in plies (positive = White mates, negative = Black). */
	mate: number | null;
	/** Search depth reached for this line. */
	depth: number;
	/** Principal variation as UCI moves (e.g. ["e2e4", "e7e5"]). */
	pv: string[];
}

export interface AnalysisResult {
	/** Top-N lines, sorted by multipv ascending. */
	lines: EngineLine[];
	/** Best move chosen by the engine (UCI like "e2e4"). */
	bestMove: string | null;
}

export interface AnalyzeOptions {
	/** Max search depth (default 16). Higher = stronger but slower. */
	depth?: number;
	/** Number of PV lines to return (default 3). */
	multiPV?: number;
	/**
	 * AbortSignal — when fired we issue a UCI `stop` and the promise
	 * resolves with whatever lines have been seen so far.
	 */
	signal?: AbortSignal;
}

export interface PlayMoveOptions {
	/**
	 * Stockfish "Skill Level" UCI option, 0–20. Lower picks weaker moves
	 * intentionally so the engine plays at human-ish strength. Default 8.
	 *   0  ≈ ~1100 Elo (random-ish, beginner)
	 *   8  ≈ ~1700 Elo (decent club player)
	 *   15 ≈ ~2200 Elo (expert)
	 *   20 = full strength (~3000+ in this build)
	 */
	skillLevel?: number;
	/** Search depth ceiling. Defaults scale with skillLevel. */
	depth?: number;
	signal?: AbortSignal;
}

class StockfishEngine {
	private worker: Worker | null = null;
	private ready: Promise<void> | null = null;
	private currentResolve: ((res: AnalysisResult) => void) | null = null;
	private currentLines = new Map<number, EngineLine>();
	private currentBestMove: string | null = null;
	private currentSignal: AbortSignal | null = null;
	private currentSignalHandler: (() => void) | null = null;
	private busy = false;
	private queue: Array<() => void> = [];

	/** Lazy-spawn the worker on first analyze; safe to call repeatedly. */
	private ensureReady(): Promise<void> {
		if (this.ready) return this.ready;
		this.ready = new Promise<void>((resolve, reject) => {
			try {
				const blob = new Blob([engineSource], {
					type: "application/javascript",
				});
				const url = URL.createObjectURL(blob);
				this.worker = new Worker(url);
				this.worker.onmessage = (ev: MessageEvent<string>) => {
					this.handleLine(ev.data);
				};
				this.worker.onerror = (ev) => {
					console.error("Stockfish worker error", ev);
				};

				let acked = false;
				const ackHandler = (ev: MessageEvent<string>) => {
					if (acked) return;
					if (typeof ev.data === "string" && ev.data.startsWith("uciok")) {
						acked = true;
						this.worker?.removeEventListener("message", ackHandler);
						resolve();
					}
				};
				this.worker.addEventListener("message", ackHandler);

				this.send("uci");
			} catch (e) {
				reject(e instanceof Error ? e : new Error(String(e)));
			}
		});
		return this.ready;
	}

	async analyze(
		fen: string,
		opts: AnalyzeOptions = {}
	): Promise<AnalysisResult> {
		const depth = Math.max(1, Math.min(opts.depth ?? 16, 24));
		const multiPV = Math.max(1, Math.min(opts.multiPV ?? 3, 5));
		return this.runSearch(fen, opts.signal, [
			`setoption name Skill Level value 20`,
			`setoption name MultiPV value ${multiPV}`,
			`position fen ${fen}`,
			`go depth ${depth}`,
		]);
	}

	/**
	 * Pick a move at "human" strength using Stockfish's Skill Level option.
	 * Returns the bestmove in UCI form (e.g. "e2e4" or "e7e8q") or null if
	 * the position has no legal moves.
	 */
	async findBestMove(
		fen: string,
		opts: PlayMoveOptions = {}
	): Promise<string | null> {
		const skill = Math.max(0, Math.min(opts.skillLevel ?? 8, 20));
		// Lower skill levels also get shallower searches so the engine
		// makes its weak moves quickly. Caller can override `depth` to
		// pin a specific search budget.
		const defaultDepth = 4 + Math.floor(skill / 2);
		const depth = Math.max(1, Math.min(opts.depth ?? defaultDepth, 20));
		const res = await this.runSearch(fen, opts.signal, [
			`setoption name Skill Level value ${skill}`,
			`setoption name MultiPV value 1`,
			`position fen ${fen}`,
			`go depth ${depth}`,
		]);
		return res.bestMove;
	}

	/**
	 * Shared "send these UCI commands and wait for `bestmove`" path used
	 * by both analyze and findBestMove. The caller passes the full command
	 * sequence (including the position + go), and we collect every `info`
	 * line plus the final `bestmove`.
	 */
	private async runSearch(
		_fen: string,
		signal: AbortSignal | undefined,
		commands: string[]
	): Promise<AnalysisResult> {
		await this.ensureReady();
		// Serialize requests through a tiny in-memory queue. Stockfish only
		// runs one search at a time, so queueing is the cleanest contract.
		if (this.busy) {
			await new Promise<void>((resolve) => this.queue.push(resolve));
		}
		this.busy = true;

		this.currentLines.clear();
		this.currentBestMove = null;

		return new Promise<AnalysisResult>((resolve) => {
			this.currentResolve = resolve;
			this.currentSignal = signal ?? null;
			if (signal) {
				if (signal.aborted) {
					this.send("stop");
				} else {
					this.currentSignalHandler = () => this.send("stop");
					signal.addEventListener(
						"abort",
						this.currentSignalHandler,
						{ once: true }
					);
				}
			}

			// `ucinewgame` between searches keeps Stockfish from carrying
			// pondering / killer-move state across positions, which would
			// otherwise leak strength even when Skill Level is low.
			this.send("ucinewgame");
			for (const cmd of commands) this.send(cmd);
		});
	}

	private send(cmd: string): void {
		this.worker?.postMessage(cmd);
	}

	private handleLine(line: string): void {
		if (!line) return;
		if (line.startsWith("info ")) {
			const parsed = parseInfoLine(line);
			if (parsed) {
				this.currentLines.set(parsed.multipv, parsed);
			}
			return;
		}
		if (line.startsWith("bestmove ")) {
			const parts = line.split(/\s+/);
			this.currentBestMove =
				parts[1] && parts[1] !== "(none)" ? parts[1] : null;
			this.finishCurrent();
			return;
		}
	}

	private finishCurrent(): void {
		const resolve = this.currentResolve;
		const lines = Array.from(this.currentLines.values()).sort(
			(a, b) => a.multipv - b.multipv
		);
		const bestMove = this.currentBestMove;

		if (this.currentSignal && this.currentSignalHandler) {
			this.currentSignal.removeEventListener(
				"abort",
				this.currentSignalHandler
			);
		}

		this.currentResolve = null;
		this.currentLines.clear();
		this.currentBestMove = null;
		this.currentSignal = null;
		this.currentSignalHandler = null;
		this.busy = false;

		const next = this.queue.shift();
		if (next) next();

		resolve?.({ lines, bestMove });
	}

	/** Tear down the worker. Called when the plugin unloads. */
	terminate(): void {
		this.worker?.terminate();
		this.worker = null;
		this.ready = null;
	}
}

let SINGLETON: StockfishEngine | null = null;

export function getEngine(): StockfishEngine {
	if (!SINGLETON) SINGLETON = new StockfishEngine();
	return SINGLETON;
}

export function terminateEngine(): void {
	SINGLETON?.terminate();
	SINGLETON = null;
}

/**
 * Parse one UCI `info` line into a structured EngineLine. Returns null for
 * lines without enough fields to be useful (e.g. "info string ..." log
 * spam, or info lines without a PV yet).
 */
function parseInfoLine(line: string): EngineLine | null {
	const tokens = line.split(/\s+/);
	let depth = 0;
	let multipv = 1;
	let cp: number | null = null;
	let mate: number | null = null;
	let pv: string[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const tok = tokens[i];
		switch (tok) {
			case "depth":
				depth = parseInt(tokens[++i] ?? "0", 10) || 0;
				break;
			case "multipv":
				multipv = parseInt(tokens[++i] ?? "1", 10) || 1;
				break;
			case "score": {
				const kind = tokens[++i];
				const value = parseInt(tokens[++i] ?? "0", 10) || 0;
				if (kind === "cp") cp = value;
				else if (kind === "mate") mate = value;
				break;
			}
			case "pv":
				pv = tokens.slice(i + 1);
				i = tokens.length;
				break;
		}
	}

	if (pv.length === 0) return null;
	return { multipv, cp, mate, depth, pv };
}
