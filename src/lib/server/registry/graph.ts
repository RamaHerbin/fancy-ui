/**
 * The import graph of the React sources, read as text.
 *
 * Pure functions over paths relative to `react/src` and source strings; no
 * file system. Statements are matched at the start of a line, the shape the
 * formatter guarantees for real imports, so prose in doc comments that quotes
 * an import (always behind `*` or `//`) never reads as one.
 */

/** `import … from "x";`, `import type … from "x";`, `import "x";` at line start. */
const IMPORT_STATEMENT =
	/^([\t ]*import\s*(?:type\s+)?(?:[\w$*{}\s,]+?\s*\bfrom\s*)?)(["'])([^"'\n]+)\2/gm;
/** `export … from "x";` and `export type { … } from "x";` at line start. */
const REEXPORT_STATEMENT =
	/^([\t ]*export\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*)(["'])([^"'\n]+)\2/gm;
/** `import("x")` anywhere. */
const DYNAMIC_IMPORT = /(\bimport\s*\(\s*)(["'])([^"'\n]+)\2/g;

const PATTERNS = [IMPORT_STATEMENT, REEXPORT_STATEMENT, DYNAMIC_IMPORT];

/** Anything in the react / react-dom family, JSX runtimes included. */
const REACT_PACKAGE = /^react(-dom)?(\/|$)/;

/** Every module specifier the code names, in source order of each pattern. */
export function specifiers(code: string): string[] {
	const out: string[] = [];
	for (const pattern of PATTERNS) {
		for (const match of code.matchAll(pattern)) out.push(match[3]);
	}
	return out;
}

/** The relative specifiers (`./x.js`, `../../utils.js`, `./x.css`), unique, sorted. */
export function relativeSpecifiers(code: string): string[] {
	return [...new Set(specifiers(code).filter((s) => s.startsWith(".")))].sort();
}

/**
 * The npm packages the code imports: bare specifiers reduced to their package
 * name (`three/examples/x` → `three`, `@scope/pkg/sub` → `@scope/pkg`), React
 * itself left out. Unique, sorted.
 */
export function npmDependencies(code: string): string[] {
	const out = new Set<string>();
	for (const spec of specifiers(code)) {
		if (spec.startsWith(".") || spec.startsWith("/") || REACT_PACKAGE.test(spec)) continue;
		const parts = spec.split("/");
		out.add(spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]);
	}
	return [...out].sort();
}

/** `fromPath`'s directory joined with `spec`; `null` when it climbs above the root. */
export function joinRelative(fromPath: string, spec: string): string | null {
	const segments = fromPath.split("/").slice(0, -1);
	for (const part of spec.split("/")) {
		if (part === "." || part === "") continue;
		if (part === "..") {
			if (segments.length === 0) return null;
			segments.pop();
		} else segments.push(part);
	}
	return segments.join("/");
}

/**
 * The file a relative specifier names, among `known` paths.
 *
 * `.js` / `.jsx` resolve to the `.ts` / `.tsx` source (the package writes
 * output extensions); a `.css` or other literal extension is taken as is; an
 * extensionless specifier tries `.ts`, `.tsx`, then a directory `index`.
 * Returns `null` when nothing matches.
 */
export function resolveSpecifier(
	fromPath: string,
	spec: string,
	known: ReadonlySet<string>
): string | null {
	const base = joinRelative(fromPath, spec);
	if (base === null) return null;
	const candidates: string[] = [];
	if (/\.jsx?$/.test(base)) {
		const stem = base.replace(/\.jsx?$/, "");
		candidates.push(`${stem}.ts`, `${stem}.tsx`, base);
	} else if (/\.[a-z]+$/i.test(base) && !/\.(ts|tsx)$/.test(base)) {
		candidates.push(base);
	} else {
		candidates.push(base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`);
	}
	return candidates.find((c) => known.has(c)) ?? null;
}

/**
 * The registry item a source file belongs to, or `null` for files outside
 * every item (the root barrel, `cameleon/`, test setup).
 */
export function groupOf(relPath: string): string | null {
	if (relPath === "utils.ts") return "utils";
	const parts = relPath.split("/");
	if (parts[0] === "components" && parts.length >= 3) return parts[1];
	if (parts[0] === "sound" && parts.length >= 2) return "sound";
	if (parts[0] === "internals") {
		if (parts.length === 2) return "internals";
		if (parts[1] === "dom" || parts[1] === "motion" || parts[1] === "markdown") {
			return `internals-${parts[1]}`;
		}
	}
	return null;
}

/**
 * Files that never ship: tests, harnesses, the Web Audio mock, READMEs and
 * anything that is not `.ts` / `.tsx` / `.css`. (`dev.ts` is decided by the
 * builder, which keeps it only when a kept file imports it.)
 */
export function isExcluded(relPath: string): boolean {
	const file = relPath.split("/").pop() ?? relPath;
	if (!/\.(ts|tsx|css)$/.test(file)) return true;
	if (/\.test\.tsx?$/.test(file)) return true;
	if (/Harness\.tsx?$/.test(file)) return true;
	if (/^web-audio-mock\.ts$/.test(file)) return true;
	if (/^README/i.test(file)) return true;
	return false;
}

/**
 * Every path reachable from `start` along `edges` (start included), sorted.
 * `edges` maps a path to the paths it imports; a missing entry means none.
 */
export function closure(
	start: Iterable<string>,
	edges: ReadonlyMap<string, readonly string[]>
): string[] {
	const seen = new Set<string>();
	const stack = [...start];
	while (stack.length > 0) {
		const path = stack.pop() as string;
		if (seen.has(path)) continue;
		seen.add(path);
		for (const next of edges.get(path) ?? []) if (!seen.has(next)) stack.push(next);
	}
	return [...seen].sort();
}

/** Rewrite relative `./x.js` / `../y.js` specifiers to extensionless form. */
export function stripJsExtensions(code: string): string {
	let out = code;
	for (const pattern of PATTERNS) {
		out = out.replace(pattern, (whole, prefix: string, quote: string, spec: string) =>
			spec.startsWith(".") && spec.endsWith(".js")
				? `${prefix}${quote}${spec.slice(0, -3)}${quote}`
				: whole
		);
	}
	return out;
}

/**
 * Keys of `SERVER_MODULES` in `react/scripts/client-boundary.mjs`, read out of
 * its source text: ".js" paths relative to `react/src` that ship WITHOUT the
 * client directive. Parsed as text so the untyped `.mjs` never enters the
 * site's type check.
 */
export function serverModulesFrom(source: string): Set<string> {
	const block = source.match(/export const SERVER_MODULES = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
	const keys = block ? [...block[1].matchAll(/^\t"([^"]+)":/gm)].map((m) => m[1]) : [];
	if (!keys.includes("utils.js")) {
		throw new Error("SERVER_MODULES not found in react/scripts/client-boundary.mjs");
	}
	return new Set(keys);
}
