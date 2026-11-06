/**
 * Loads the pure-data motion vocabulary (`_internals/motion/token-values.ts`)
 * from plain Node and turns it into the list of `--ft-*` CSS declarations.
 * Shared by `gen-motion-tokens.mjs` (writes the block into each package's
 * `tailwind.css`).
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TOKEN_VALUES_PATH = resolve(
	here,
	"..",
	"..",
	"src",
	"lib",
	"fancy-ui",
	"_internals",
	"motion",
	"token-values.ts"
);

/** Transpile `token-values.ts` and import the result. */
export async function loadTokenValues(path = DEFAULT_TOKEN_VALUES_PATH) {
	const source = readFileSync(path, "utf8");
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
	});
	let mod;
	try {
		const encoded = Buffer.from(outputText, "utf8").toString("base64");
		mod = await import(`data:text/javascript;base64,${encoded}`);
	} catch {
		const dir = mkdtempSync(join(tmpdir(), "ft-token-values-"));
		const file = join(dir, "token-values.mjs");
		writeFileSync(file, outputText);
		mod = await import(pathToFileURL(file).href);
	}
	const { DURATIONS, EASINGS, STAGGERS, STAGGER_CAP, HOVER } = mod;
	return { DURATIONS, EASINGS, STAGGERS, STAGGER_CAP, HOVER };
}

/**
 * The `[name, value]` pairs, in the order they are written: durations,
 * easings, staggers, then the hover pair. `STAGGER_CAP` is a px ramp, not a
 * CSS value, so it is not emitted.
 */
/** `charBlur` → `char-blur`. */
export function kebab(key) {
	return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

export function motionTokenDeclarations({ DURATIONS, EASINGS, STAGGERS, HOVER }) {
	const out = [];
	for (const [key, ms] of Object.entries(DURATIONS)) out.push([`--ft-duration-${key}`, `${ms}ms`]);
	for (const [key, curve] of Object.entries(EASINGS)) out.push([`--ft-ease-${key}`, curve]);
	// `charBlur` → `--ft-stagger-char-blur`: custom properties are kebab-case.
	for (const [key, ms] of Object.entries(STAGGERS))
		out.push([`--ft-stagger-${kebab(key)}`, `${ms}ms`]);
	for (const side of ["in", "out"]) {
		const { duration, easing } = HOVER[side];
		out.push([`--ft-hover-${side}`, `${DURATIONS[duration]}ms ${EASINGS[easing]}`]);
	}
	return out;
}
