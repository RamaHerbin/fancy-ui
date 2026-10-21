// Portable development-mode flag.
//
// Bundlers rewrite the literal text `process.env.NODE_ENV` at build time (Vite
// in dev and build, webpack, esbuild, Rollup with a replace step), so it must
// appear verbatim: any indirection (an alias, optional chaining on `process`,
// a `typeof process` guard in front) defeats the rewrite and the flag would
// read false in every browser bundle. Where nothing rewrites it and no
// `process` exists, the read throws, is caught, and the flag is false: the
// safe default for a published package. `process` is declared locally so no
// Node typings are needed.
declare const process: { env: { NODE_ENV?: string } };

function readDev(): boolean {
	try {
		return process.env.NODE_ENV !== "production";
	} catch {
		return false;
	}
}

export const isDev: boolean = readDev();
