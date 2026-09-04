/**
 * Where the `"use client"` boundary falls in the emitted package.
 *
 * One definition, two readers: `vite.config.ts` calls it during the build to
 * decide which modules get the directive, and `scripts/check-dist-shape.mjs`
 * re-runs it against the written `dist/`, so a hand edit or a Rollup upgrade
 * cannot move the boundary without the build going red.
 *
 * ## The default is client, and the exceptions are named
 *
 * Every emitted module carries the directive except the six named below. That
 * is deliberate, and the inverse rule — "skip the directive wherever the module
 * imports no React" — was tried first and is wrong twice over:
 *
 *  - `components/select/types.ts` imports no React but calls
 *    `createInternalContext()` at module scope, and that function lives in a
 *    module that does. Classified as a server module it produces "Attempted to
 *    call createInternalContext() from the server" at Next's page-data step.
 *  - A skin object and the fireworks shape helpers import no React either, and
 *    both are meant to be PASSED as props into a client component. A value
 *    exported from a client module crosses that boundary as a client reference,
 *    which is what makes `<FancyProvider skin={brutalSkin}>` legal from a
 *    Server Component; the same value exported from a server module is real
 *    data whose functions React refuses to serialize.
 *
 * So the boundary is a published contract rather than an inference. The list
 * holds exactly what a Server Component may evaluate: the two public barrels,
 * which forward and never call, plus four modules of plain data and one pure
 * function. `boundaryProblems()` proves each one can keep that promise.
 *
 * Blanket-directive was the state before, and it cost the whole carve-out: in
 * an RSC graph every export of a client module becomes a client reference, so
 * `cn()` called from a Server Component threw and `SOUND_CUES` read there was a
 * reference object rather than the table.
 */

/** Anything in the react / react-dom family, JSX runtimes included. */
export const REACT_PACKAGE = /^react(-dom)?(\/|$)/;

/** The directive itself, spelled once. */
export const USE_CLIENT = '"use client";';

/**
 * The emitted modules that ship WITHOUT the directive, and why each may.
 *
 * Keys are output-relative file names. Anything not named here is a client
 * module. Adding an entry is a change to what the package promises a Server
 * Component can do, so it belongs in README's "Server Components" section in
 * the same commit.
 */
export const SERVER_MODULES = Object.freeze({
	"index.js":
		"public barrel: imports nothing but re-exports, so it forwards client " +
		"references without ever calling one",
	"cameleon/index.js": "public barrel for the ./cameleon subpath, same shape as the root one",
	"utils.js": "cn() — clsx + tailwind-merge, a pure function of its arguments",
	"sound/types.js": "the sound constant tables (SOUND_CUES, SOUND_LIMITS, …), plain data",
	"sound/themes.js": "the shipped sound themes plus their pure validators",
	"components/book/index.js": "the book colour / size / radius maps, plain data",
});

/**
 * Source with its comments removed and its string literals left intact.
 *
 * Both callers match statement shapes, and this package documents its own
 * conventions in prose that quotes them — a doc comment naming an import would
 * otherwise read as one.
 */
export function withoutComments(source) {
	let out = "";
	let quote = null;
	for (let i = 0; i < source.length; ) {
		const char = source[i];
		if (quote) {
			out += char;
			if (char === "\\") {
				out += source[i + 1] ?? "";
				i += 2;
				continue;
			}
			if (char === quote) quote = null;
			i += 1;
		} else if (char === '"' || char === "'" || char === "`") {
			quote = char;
			out += char;
			i += 1;
		} else if (char === "/" && source[i + 1] === "/") {
			while (i < source.length && source[i] !== "\n") i += 1;
		} else if (char === "/" && source[i + 1] === "*") {
			i += 2;
			while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
			i += 2;
		} else {
			out += char;
			i += 1;
		}
	}
	return out;
}

/** `import … "spec";` and `export … from "spec";` — no binding lists, just specifiers. */
const IMPORT_STATEMENT = /\bimport\s*(?:[^;]*?\bfrom\s*)?["']([^"']+)["']\s*;/g;
const REEXPORT_STATEMENT = /\bexport\s*(?:\*(?:\s+as\s+[^\s]+)?|\{[^}]*\})\s*from\s*["']([^"']+)["']\s*;/g;
/** A trailing `export { a, b as c };` list, which carries no code of its own. */
const EXPORT_LIST = /\bexport\s*\{[^}]*\}\s*;/g;

/** Every module specifier the code names, import or re-export alike. */
export function specifiersOf(code) {
	const out = [];
	for (const [, specifier] of code.matchAll(IMPORT_STATEMENT)) out.push(specifier);
	for (const [, specifier] of code.matchAll(REEXPORT_STATEMENT)) out.push(specifier);
	return out;
}

/**
 * True when the module's whole body is import statements and export lists.
 *
 * Rollup normalises `export { x } from "./y.js"` into an import plus a trailing
 * export list rather than keeping the re-export form, so the shape has to be
 * recognised from what is left once both are removed — nothing, for a barrel.
 * A module of this shape evaluates no code of its own, which is what lets it
 * name a client module without calling into it.
 */
export function isPureReExport(code) {
	const rest = withoutComments(code)
		.replace(IMPORT_STATEMENT, "")
		.replace(REEXPORT_STATEMENT, "")
		.replace(EXPORT_LIST, "");
	return rest.trim() === "";
}

/** Resolve a relative specifier against the importing module's own file name. */
export function resolveFrom(fileName, specifier) {
	if (!specifier.startsWith(".")) return undefined;
	const segments = fileName.split("/").slice(0, -1);
	for (const part of specifier.split("/")) {
		if (part === "." || part === "") continue;
		if (part === "..") segments.pop();
		else segments.push(part);
	}
	return segments.join("/");
}

/**
 * The emitted file names that must carry the directive: everything but the list.
 *
 * @param modules records of `{ fileName, code }` for every emitted `.js`, file
 *   names relative to the output root (`components/button/Button.js`).
 * @returns a `Set` of those file names.
 */
export function clientModules(modules) {
	return new Set(
		modules.map((m) => m.fileName).filter((fileName) => !(fileName in SERVER_MODULES))
	);
}

/**
 * Everything that would make a listed server module unable to keep its promise.
 *
 * A server module is evaluated on the server, so it must (a) exist, (b) import
 * no React, and (c) either be a pure re-export barrel — which calls nothing —
 * or import only other server modules. (c) is the condition the first version
 * of this rule violated, and the one that produced a build error rather than a
 * silent wrong answer.
 *
 * @returns an array of human-readable problems; empty means the list holds.
 */
export function boundaryProblems(modules) {
	const problems = [];
	const code = new Map(modules.map((m) => [m.fileName, withoutComments(m.code)]));

	for (const fileName of Object.keys(SERVER_MODULES)) {
		if (!code.has(fileName)) {
			problems.push(
				`${fileName} is listed as a server module but the build emitted no such file — ` +
					`remove it from SERVER_MODULES or fix the name.`
			);
		}
	}

	for (const [fileName, body] of code) {
		if (!(fileName in SERVER_MODULES)) continue;
		const specifiers = specifiersOf(body);

		for (const specifier of specifiers) {
			if (REACT_PACKAGE.test(specifier)) {
				problems.push(
					`${fileName} ships without "use client" but imports "${specifier}" — ` +
						`React code cannot run in a Server Component.`
				);
			}
		}

		if (isPureReExport(body)) continue; // forwards only; never calls a client module

		for (const specifier of specifiers) {
			const target = resolveFrom(fileName, specifier);
			if (!target || target in SERVER_MODULES) continue;
			problems.push(
				`${fileName} ships without "use client" and evaluates code, yet imports the ` +
					`client module ${target} — calling into it from the server throws ` +
					`"Attempted to call … from the server".`
			);
		}
	}

	return problems;
}
