// Dev-only diagnostics gate.
//
// `process.env.NODE_ENV` is the one flag every React toolchain already
// replaces statically, so it is read as that exact literal, inside try/catch:
// where nothing rewrites it and no `process` exists the read throws, is caught,
// and the gate reads false, the safe default for a published package. No
// `typeof process` guard may sit in front: in a browser bundle it would
// short-circuit before the rewritten literal is reached. `process` is declared
// locally so no Node typings are needed.
//
// Read lazily, inside a function: nothing here may run at module scope, so the
// value can never differ between a server render and its hydration.
declare const process: { env: { NODE_ENV?: string } };

export function isDev(): boolean {
	try {
		return process.env.NODE_ENV !== "production";
	} catch {
		return false;
	}
}
