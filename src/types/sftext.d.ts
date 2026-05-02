// esbuild loads `.sftext` imports as plain strings (configured in
// esbuild.config.mjs). Declaring the module shape here lets TypeScript
// type-check imports of vendored asm.js engine source.
declare module "*.sftext" {
	const content: string;
	export default content;
}
