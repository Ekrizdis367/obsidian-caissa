import { App, MarkdownPostProcessorContext, Notice, TFile } from "obsidian";

export interface BlockRewriteUpdates {
	/** Set the `opening:` key. Pass empty string to remove it. */
	opening?: string;
	/** Set the `variation:` key. Pass empty string to remove it. */
	variation?: string;
	/** Set the `endgame:` key. Pass empty string to remove it. */
	endgame?: string;
	/** Set the `wccgame:` key. Pass empty string to remove it. */
	wccgame?: string;
}

/** Keys whose lines we may rewrite or strip. Anything else is preserved verbatim. */
const REWRITABLE_KEYS = new Set([
	"opening",
	"variation",
	"endgame",
	"wccgame",
	"wcc",
]);

/**
 * Rewrite the `chess` code block backed by `el` so that its `opening:` and/or
 * `variation:` lines reflect `updates`. All other body lines (style options,
 * comments, blanks) are preserved in their original order.
 *
 * Returns true on success, false if the block can't be located (e.g. inside a
 * callout, transcluded preview, or the source file has gone missing).
 */
export async function rewriteChessBlock(
	app: App,
	ctx: MarkdownPostProcessorContext,
	el: HTMLElement,
	updates: BlockRewriteUpdates
): Promise<boolean> {
	const info = ctx.getSectionInfo(el);
	if (!info) {
		new Notice(
			"Couldn't locate this chess block in the source file. Try editing the block manually."
		);
		return false;
	}

	const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) {
		new Notice("Couldn't find the note for this chess block.");
		return false;
	}

	// `lineStart` is the opening fence (```chess), `lineEnd` is the closing fence (```).
	const bodyStart = info.lineStart + 1;
	const bodyEnd = info.lineEnd;

	// Use vault.process so the read-modify-write is atomic against any
	// concurrent edits to the same file. If the boundaries no longer line up
	// (e.g. the user edited the file since the post-processor ran), we bail
	// out by returning the original contents unchanged.
	let aborted = false;
	let succeeded = false;
	await app.vault.process(file, (data) => {
		const lines = data.split("\n");
		if (bodyStart > bodyEnd || bodyEnd > lines.length) {
			aborted = true;
			return data;
		}
		const oldBody = lines.slice(bodyStart, bodyEnd);
		const newBody = applyUpdates(oldBody, updates);
		const newLines = [
			...lines.slice(0, bodyStart),
			...newBody,
			...lines.slice(bodyEnd),
		];
		succeeded = true;
		return newLines.join("\n");
	});

	if (aborted) {
		new Notice("Chess block boundaries look wrong; aborting rewrite.");
		return false;
	}
	return succeeded;
}

/**
 * Apply `updates` to the body of a chess block. Non-rewritable lines pass
 * through unchanged; rewritable lines are stripped first, then the new values
 * are appended (preserving relative order: opening before variation).
 */
function applyUpdates(
	body: string[],
	updates: BlockRewriteUpdates
): string[] {
	const preserved: string[] = [];
	for (const line of body) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
			preserved.push(line);
			continue;
		}
		const colon = trimmed.indexOf(":");
		if (colon === -1) {
			preserved.push(line);
			continue;
		}
		const key = trimmed.slice(0, colon).trim().toLowerCase();
		if (!REWRITABLE_KEYS.has(key)) {
			preserved.push(line);
		}
	}

	// Drop trailing blank lines so we don't accumulate extra whitespace
	// every time the user changes selection.
	while (preserved.length > 0 && preserved[preserved.length - 1]?.trim() === "") {
		preserved.pop();
	}

	const newKeyLines: string[] = [];
	if (updates.opening && updates.opening.trim()) {
		newKeyLines.push(`opening: ${updates.opening.trim()}`);
	}
	if (updates.variation && updates.variation.trim()) {
		newKeyLines.push(`variation: ${updates.variation.trim()}`);
	}
	if (updates.endgame && updates.endgame.trim()) {
		newKeyLines.push(`endgame: ${updates.endgame.trim()}`);
	}
	if (updates.wccgame && updates.wccgame.trim()) {
		newKeyLines.push(`wccgame: ${updates.wccgame.trim()}`);
	}

	if (preserved.length === 0) {
		return newKeyLines;
	}
	return [...preserved, ...newKeyLines];
}
