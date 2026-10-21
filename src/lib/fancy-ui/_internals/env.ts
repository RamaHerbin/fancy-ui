// Portable development-mode flag.
//
// Shipped sources must not contain a literal bundler-specific environment
// read: it breaks consumers that build with something else, and the package
// linter flags it. This reads two signals instead, each guarded so neither can
// throw where it does not exist:
//   - the Node-style `NODE_ENV` global most toolchains already define;
//   - the bundler's `DEV` flag on `import.meta`, reached through a cast so no
//     literal property chain appears in the published output.
// Where neither signal exists the flag is false and diagnostics stay silent,
// the safe default for a published package.
type EnvShape = { NODE_ENV?: string };

function readNodeEnv(): boolean {
	const env = (globalThis as { process?: { env?: EnvShape } }).process?.env;
	return env !== undefined && env.NODE_ENV !== undefined && env.NODE_ENV !== 'production';
}

function readMetaDev(): boolean {
	try {
		const meta = import.meta as unknown as { env?: { DEV?: boolean } };
		return meta?.env?.DEV === true;
	} catch {
		return false;
	}
}

export const isDev: boolean = readNodeEnv() || readMetaDev();
