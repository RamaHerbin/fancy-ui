// Dev-only diagnostics gate.
//
// The reference implementation guards its console warnings with a bundler
// global that this package cannot rely on: consumers build with whatever they
// like, and `react/tsconfig.json` pulls in no ambient types declaring it.
// `process.env.NODE_ENV` is the one flag every React toolchain already
// replaces (React itself is compiled against it), and where no such global
// exists the gate reads `false` and the diagnostics stay silent — the safe
// default for a published package.
//
// Read lazily, inside a function: nothing here may run at module scope, so the
// value can never differ between a server render and its hydration.
export function isDev(): boolean {
	const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env;
	return env?.NODE_ENV !== undefined && env.NODE_ENV !== "production";
}
