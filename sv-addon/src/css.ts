import { parse } from "@sveltejs/sv-utils";

/** The stylesheet fancy-ui-svelte ships for Tailwind CSS v4: sources, dark variant, theme tokens. */
export const FANCY_CSS = "fancy-ui-svelte/tailwind.css";

type CssImport = { specifier: string; quote: '"' | "'"; start: number; end: number };

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

/** Top-level `@import` rules of a stylesheet, in source order, with their source offsets. */
export function cssImports(content: string): CssImport[] {
	if (!content.trim()) return [];
	const { ast } = parse.css(content);
	const out: CssImport[] = [];
	for (const node of ast.children) {
		if (node.type !== "Atrule" || node.name !== "import") continue;
		const spec = importSpecifier(String(node.prelude));
		if (spec) out.push({ ...spec, start: node.start, end: node.end });
	}
	return out;
}

export function hasTailwindImport(content: string): boolean {
	return cssImports(content).some((i) => isTailwindSpecifier(i.specifier));
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
	return content.slice(0, last.end) + eol + line + content.slice(last.end);
}
