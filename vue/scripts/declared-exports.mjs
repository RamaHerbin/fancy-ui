/**
 * Every name a declaration entry exports, as the TypeScript checker resolves
 * it — `export *` chains included. `vue-floor-consumer.mjs` copies this file
 * into its scratch consumer (where the floor `typescript` is installed) to
 * build its type probe; a regex over the entry's text only ever sees the
 * direct `export { ... }` blocks, which on this barrel is `cn` alone.
 */
import ts from "typescript";

/** @param {string} file absolute path to a `.d.ts` entry */
export function declaredExports(file) {
	const program = ts.createProgram([file], {
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		noEmit: true,
		skipLibCheck: true,
	});
	const source = program.getSourceFile(file);
	if (!source) throw new Error(`no declaration file at ${file}`);
	const checker = program.getTypeChecker();
	const symbol = checker.getSymbolAtLocation(source);
	if (!symbol) return [];
	return checker
		.getExportsOfModule(symbol)
		.map((entry) => entry.name)
		.sort();
}
