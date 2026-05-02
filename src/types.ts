export type PieceColor = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Orientation = "white" | "black";
export type PieceSet =
	| "cburnett"
	| "merida"
	| "staunty"
	| "caliente"
	| "pixel"
	| "letter"
	| "unicode";

/** All SVG-backed piece set IDs (i.e. everything except the pure-text fallback). */
export const SVG_PIECE_SETS: ReadonlyArray<PieceSet> = [
	"cburnett",
	"merida",
	"staunty",
	"caliente",
	"pixel",
	"letter",
];

/** All piece set IDs that the parser/settings UI should accept. */
export const ALL_PIECE_SETS: ReadonlyArray<PieceSet> = [
	...SVG_PIECE_SETS,
	"unicode",
];
export type ExplorerSource = "masters" | "lichess";
export type BoardSize = "small" | "medium" | "large" | "full";

export interface CaissaSettings {
	pieceSet: PieceSet;
	lightSquareColor: string;
	darkSquareColor: string;
	lastMoveColor: string;
	coordinateColor: string;
	defaultOrientation: Orientation;
	showCoordinates: boolean;
	showInteractiveControls: boolean;
	/** Show captured-pieces trays + material balance below/above the board. */
	showCapturedPieces: boolean;
	/**
	 * Master switch for the Opening Explorer panel. When enabled, the plugin
	 * makes anonymous GET requests to https://explorer.lichess.ovh per
	 * position to fetch win/draw/loss statistics. OFF by default — see
	 * README "Privacy" section.
	 */
	enableOpeningExplorer: boolean;
	explorerSource: ExplorerSource;
	explorerMaxLines: number;
	/**
	 * Lichess personal access token. The Opening Explorer API requires
	 * authentication as of March 2026. Create one at
	 * https://lichess.org/account/oauth/token (no scopes needed).
	 */
	lichessApiToken: string;
}

/**
 * Named color presets for board squares. Picking a preset in the settings UI
 * just writes the two colors below into {@link CaissaSettings}; the rest
 * of the renderer keeps reading the raw color strings as before.
 */
export interface BoardColorPreset {
	id: string;
	label: string;
	light: string;
	dark: string;
}

/** Built-in board color presets, in display order. */
export const BOARD_COLOR_PRESETS: ReadonlyArray<BoardColorPreset> = [
	{
		id: "brown",
		label: "Brown",
		light: "#f0d9b5",
		dark: "#b58863",
	},
	{
		id: "green",
		label: "Green",
		light: "#eeeed2",
		dark: "#769656",
	},
];

export const DEFAULT_SETTINGS: CaissaSettings = {
	pieceSet: "cburnett",
	lightSquareColor: "#f0d9b5",
	darkSquareColor: "#b58863",
	lastMoveColor: "rgba(155, 199, 0, 0.41)",
	coordinateColor: "#7a6a4a",
	defaultOrientation: "white",
	showCoordinates: true,
	showInteractiveControls: true,
	showCapturedPieces: true,
	enableOpeningExplorer: false,
	explorerSource: "masters",
	explorerMaxLines: 15,
	lichessApiToken: "",
};

/**
 * Headers parsed from a PGN, plus a few derived fields. Display-only —
 * the engine doesn't use these for move generation.
 */
export interface PgnHeaders {
	event?: string;
	site?: string;
	date?: string;
	round?: string;
	white?: string;
	black?: string;
	result?: string;
	whiteElo?: string;
	blackElo?: string;
	whiteTitle?: string;
	blackTitle?: string;
	eco?: string;
	openingName?: string;
	timeControl?: string;
	termination?: string;
}

/**
 * Per-board configuration parsed out of a ```chess code block.
 * All fields are optional — a totally empty block renders the start position.
 */
export interface ChessBlockConfig {
	opening?: string;
	variation?: string;
	/** Endgame technique ID/name (e.g. "B+N mate", "lucena"). */
	endgame?: string;
	/** WCC game slug (e.g. "1972-fischer-spassky-06"). */
	wccgame?: string;
	moves?: string;
	/** Full PGN text (headers + moves). Wins over `moves` if both are set. */
	pgn?: string;
	/** Lichess game ID or full https://lichess.org/<id> URL. */
	lichess?: string;
	fen?: string;
	orientation?: Orientation;
	pieces?: PieceSet;
	light?: string;
	dark?: string;
	title?: string;
	interactive?: boolean;
	coordinates?: boolean;
	startMove?: number;
	/** When false, the moves panel is hidden and the board takes the row alone. */
	showMoves?: boolean;
	/**
	 * Visual size of the board. `small`/`medium`/`large` cap the board width
	 * and keep the moves panel beside it (collapsing on narrow panes). `full`
	 * stretches the board to the writing-area width with the moves panel
	 * always below.
	 */
	size?: BoardSize;
	/** Override the global "enable explorer" switch for this block only. */
	explorer?: boolean;
	explorerSource?: ExplorerSource;
	/** Override the global "show captured pieces" toggle for this block only. */
	captured?: boolean;
	/**
	 * Whitespace-separated arrow tokens. Each token is `<from><to>` with
	 * an optional `-color` suffix. Example: `e2e4 g1f3 d2d4-blue`.
	 */
	arrows?: string;
	/**
	 * Whitespace-separated square highlight tokens. Each token is a
	 * square with an optional `-color` suffix. Example: `d4 e4-red f5-yellow`.
	 */
	highlights?: string;
	/**
	 * When true, lazy-load the bundled Stockfish 10 (asm.js) engine and
	 * show an evaluation bar + top engine lines for the current position.
	 * Off by default to avoid the worker spin-up cost on every block.
	 */
	analyze?: boolean;
	/**
	 * Switch the block into "play vs Stockfish" mode. Set to "white"/"black"
	 * to play that color (engine takes the opposite); "random" picks a
	 * coin-flip side at mount time. The starting position comes from
	 * `fen`/`opening`/`endgame` etc. — whatever you'd normally render is
	 * the starting position of the game.
	 */
	play?: "white" | "black" | "random";
	/**
	 * Stockfish "Skill Level" (0–20). Lower = weaker / more human. Defaults
	 * to 8. Combined with a shallower depth at lower levels so weak moves
	 * also come back fast.
	 */
	level?: number;
}

export interface OpeningVariation {
	name: string;
	moves: string;
	description?: string;
}

export interface Opening {
	name: string;
	aliases?: string[];
	moves: string;
	description?: string;
	variations?: OpeningVariation[];
}
