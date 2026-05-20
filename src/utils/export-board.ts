/**
 * Export a rendered board SVG as raster (PNG) or vector (SVG) image as a
 * downloaded file. SVG markup can be shown in a modal for manual copying.
 *
 * The board renderer outputs a self-contained SVG (inline gradients, no
 * external <image>/<use> refs), which is what makes the canvas-rasterize
 * round-trip safe — no taint, no CORS, no missing assets.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export interface ExportOptions {
	/** Pixel multiplier for raster output. 2 = retina-quality 720x720 PNG. */
	scale?: number;
	/** Background fill color for raster output. PNG would be transparent without it. */
	background?: string;
}

export function serializeBoardSvg(svgEl: SVGElement): string {
	return serializeSvg(svgEl);
}

export async function downloadBoardAsPng(
	svgEl: SVGElement,
	filename: string,
	opts: ExportOptions = {}
): Promise<void> {
	const blob = await rasterizeSvg(svgEl, opts);
	triggerDownload(blob, filename);
}

export function downloadBoardAsSvg(
	svgEl: SVGElement,
	filename: string
): Promise<void> {
	const xml = serializeSvg(svgEl);
	const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
	triggerDownload(blob, filename);
	return Promise.resolve();
}

/**
 * Convert the board's <svg> to a PNG blob. We clone the source so any
 * temporary attribute tweaks (xmlns, explicit width/height) don't affect
 * the live, on-screen board.
 */
async function rasterizeSvg(
	svgEl: SVGElement,
	opts: ExportOptions
): Promise<Blob> {
	const scale = opts.scale ?? 2;
	const background = opts.background ?? "#ffffff";

	const { width, height } = getViewBoxSize(svgEl);
	const xml = serializeSvg(svgEl);
	const dataUrl =
		"data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

	const img = await loadImage(dataUrl);

	const canvas = document.createElement("canvas");
	canvas.width = Math.round(width * scale);
	canvas.height = Math.round(height * scale);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not acquire 2d canvas context");

	if (background) {
		ctx.fillStyle = background;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error("Canvas returned no blob"));
				return;
			}
			resolve(blob);
		}, "image/png");
	});
}

/**
 * Serialize the SVG with explicit width/height attributes derived from its
 * viewBox so external tools (and the canvas raster path) know how big to
 * draw it. Without these, browsers default to "intrinsic 0x0" for inline-
 * rendered SVGs.
 */
function serializeSvg(svgEl: SVGElement): string {
	const clone = svgEl.cloneNode(true) as SVGElement;
	if (!clone.getAttribute("xmlns")) {
		clone.setAttribute("xmlns", SVG_NS);
	}
	const { width, height } = getViewBoxSize(svgEl);
	clone.setAttribute("width", String(width));
	clone.setAttribute("height", String(height));
	return new XMLSerializer().serializeToString(clone);
}

function getViewBoxSize(svgEl: SVGElement): { width: number; height: number } {
	const vb = svgEl.getAttribute("viewBox");
	if (vb) {
		const parts = vb.split(/\s+/).map(Number);
		if (parts.length === 4 && !parts.some(isNaN)) {
			return { width: parts[2] ?? 360, height: parts[3] ?? 360 };
		}
	}
	const rect = svgEl.getBoundingClientRect();
	return { width: rect.width || 360, height: rect.height || 360 };
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Could not load SVG into image"));
		img.src = src;
	});
}

function triggerDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Defer revoke so the browser has time to start the download.
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
