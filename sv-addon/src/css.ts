import { parse } from "@sveltejs/sv-utils";

/** The stylesheet fancy-ui-svelte ships for Tailwind CSS v4: sources, dark variant, theme tokens. */
export const FANCY_CSS = "fancy-ui-svelte/tailwind.css";

type CssImport = {
	specifier: string;
	quote: '"' | "'";
	prelude: string;
	start: number;
	end: number;
};

/**
 * The module an `@import` prelude points at, whatever the spelling:
 * `'x'`, `"x"`, `url(x)`, `url("x")`, followed or not by `layer(...)`, `source(...)` or media.
 */
export function importSpecifier(prelude: string): { specifier: string; quote: '"' | "'" } | null {
	const m = prelude.trim().match(/^(?:url\(\s*)?(["']?)([^"')\s]+)\1/);
	if (!m) return null;
	return { specifier: m[2], quote: m[1] === "'" ? "'" : '"' };
}

/** `tailwindcss` itself or one of its split entries (`tailwindcss/theme.css`, ...). */
export function isTailwindSpecifier(specifier: string): boolean {
	return specifier === "tailwindcss" || specifier.startsWith("tailwindcss/");
}

/**
 * Top-level `@import` rules of a stylesheet, in source order, with their source offsets.
 * `null` when the file does not parse (an `@import` without its `;`, an unclosed rule...):
 * one odd file must not crash `sv add`, it is reported and left alone instead.
 */
export function parseCssImports(content: string): CssImport[] | null {
	if (!content.trim()) return [];
	let children;
	try {
		children = parse.css(content).ast.children;
	} catch {
		return null;
	}
	const out: CssImport[] = [];
	for (const node of children) {
		if (node.type !== "Atrule" || node.name !== "import") continue;
		const prelude = String(node.prelude);
		const spec = importSpecifier(prelude);
		if (spec) out.push({ ...spec, prelude, start: node.start, end: node.end });
	}
	return out;
}

/** Like parseCssImports, an unparsable file counting as one without imports. */
export function cssImports(content: string): CssImport[] {
	return parseCssImports(content) ?? [];
}

export function hasTailwindImport(content: string): boolean {
	return cssImports(content).some((i) => isTailwindSpecifier(i.specifier));
}

/**
 * The `prefix(...)` of the Tailwind import, if any. fancy-ui-svelte's components use
 * unprefixed utilities, so a prefixed Tailwind build would leave them unstyled.
 */
export function tailwindPrefix(content: string): string | null {
	for (const i of cssImports(content)) {
		if (!isTailwindSpecifier(i.specifier)) continue;
		const m = i.prelude.match(/\bprefix\(\s*([^)\s]*)\s*\)/);
		if (m) return m[1];
	}
	return null;
}

export function hasFancyImport(content: string): boolean {
	return cssImports(content).some((i) => i.specifier === FANCY_CSS);
}

/**
 * Adds `@import "fancy-ui-svelte/tailwind.css";` right after the last top-level `@import`,
 * so it lands after Tailwind and before any `@plugin`, `@custom-variant` or rule of the file.
 * The quote style follows the Tailwind import. The rest of the file is kept byte for byte
 * (comments, blank lines, formatting): the line is spliced into the source, the stylesheet
 * is never re-printed.
 *
 * Returns `false` (file untouched) when the file does not import Tailwind or already imports
 * the fancy-ui-svelte stylesheet, so running it twice gives the same output.
 */
export function addFancyImport(content: string): string | false {
	const imports = cssImports(content);
	const tailwind = imports.find((i) => isTailwindSpecifier(i.specifier));
	if (!tailwind) return false;
	if (imports.some((i) => i.specifier === FANCY_CSS)) return false;
	const last = imports[imports.length - 1];
	const eol = content.includes("\r\n") ? "\r\n" : "\n";
	const line = `@import ${tailwind.quote}${FANCY_CSS}${tailwind.quote};`;
	// A comment on the same line as the last import stays on that line: insert at its end.
	let at = last.end;
	const nl = content.indexOf("\n", at);
	const rest = content.slice(at, nl === -1 ? content.length : nl).replace(/\r$/, "");
	if (/^\s*(\/\*[\s\S]*?\*\/\s*)+$/.test(rest)) at += rest.length;
	return content.slice(0, at) + eol + line + content.slice(at);
}
