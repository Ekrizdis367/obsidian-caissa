import type { PositionStep } from "../chess/engine";

export interface MoveListOptions {
	/** All position steps including index 0 (the start position). */
	steps: PositionStep[];
	/** Currently active step index (0 = start, 1 = after white's first move...). */
	activeIndex: number;
	/** Called when the user clicks a half-move; arg is the resulting step index. */
	onSelect: (stepIndex: number) => void;
}

/**
 * Render a clean two-column move list (white | black). Step 0 (the start
 * position) is *not* rendered here — it's reachable via the "Start position"
 * button under the board, which keeps the move list strictly about moves.
 */
export function renderMoveList(host: HTMLElement, opts: MoveListOptions): void {
	host.empty();
	host.classList.add("chess-study-moves");

	const moves = opts.steps.slice(1);

	const table = host.createDiv({ cls: "chess-study-move-table" });
	const header = table.createDiv({ cls: "chess-study-move-row header" });
	header.createSpan({ cls: "chess-study-move-num", text: "#" });
	header.createSpan({ cls: "chess-study-move-cell header", text: "White" });
	header.createSpan({ cls: "chess-study-move-cell header", text: "Black" });

	if (moves.length === 0) {
		host.createDiv({
			cls: "chess-study-moves-empty",
			text: "No moves yet.",
		});
		return;
	}

	let i = 0;
	let moveNumber = 1;
	while (i < moves.length) {
		const row = table.createDiv({ cls: "chess-study-move-row" });
		row.createSpan({
			cls: "chess-study-move-num",
			text: `${moveNumber}.`,
		});

		const whiteMove = moves[i];
		if (whiteMove) {
			renderCell(row, whiteMove.san ?? "", i + 1, opts);
			i += 1;
		} else {
			row.createSpan({ cls: "chess-study-move-cell empty" });
		}

		const blackMove = moves[i];
		if (blackMove) {
			renderCell(row, blackMove.san ?? "", i + 1, opts);
			i += 1;
		} else {
			row.createSpan({ cls: "chess-study-move-cell empty" });
		}

		moveNumber += 1;
	}
}

function renderCell(
	row: HTMLElement,
	san: string,
	stepIndex: number,
	opts: MoveListOptions
): void {
	const cell = row.createSpan({
		cls: "chess-study-move-cell",
		text: san,
	});
	cell.setAttribute("role", "button");
	cell.setAttribute("tabindex", "0");
	if (stepIndex === opts.activeIndex) cell.addClass("active");
	cell.addEventListener("click", () => opts.onSelect(stepIndex));
	cell.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			opts.onSelect(stepIndex);
		}
	});
}
