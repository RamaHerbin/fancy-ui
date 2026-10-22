import { describe, expect, it } from "vitest";
import {
	FANCY_CSS,
	addFancyImport,
	hasFancyImport,
	hasTailwindImport,
	importSpecifier,
} from "../../src/css";

const twice = (css: string) => {
	const once = addFancyImport(css);
	expect(once).not.toBe(false);
	expect(addFancyImport(once as string)).toBe(false);
	return once as string;
};

describe("importSpecifier", () => {
	it.each([
		[`'tailwindcss'`, "tailwindcss", "'"],
		[`"tailwindcss"`, "tailwindcss", '"'],
		[`url(tailwindcss)`, "tailwindcss", '"'],
		[`url("tailwindcss")`, "tailwindcss", '"'],
		[`url( 'tailwindcss' )`, "tailwindcss", "'"],
		[`"tailwindcss" source(none)`, "tailwindcss", '"'],
		[`'tailwindcss/theme.css' layer(theme)`, "tailwindcss/theme.css", "'"],
		[`"fancy-ui-svelte/tailwind.css"`, FANCY_CSS, '"'],
	])("%s -> %s", (prelude, specifier, quote) => {
		expect(importSpecifier(prelude)).toEqual({ specifier, quote });
	});
});

describe("addFancyImport", () => {
	it("adds the import after tailwind, single quotes kept (official add-on output)", () => {
		expect(twice(`@import 'tailwindcss';\n`)).toBe(
			`@import 'tailwindcss';\n@import 'fancy-ui-svelte/tailwind.css';\n`
		);
	});

	it("double quotes kept", () => {
		expect(twice(`@import "tailwindcss";\n`)).toBe(
			`@import "tailwindcss";\n@import "fancy-ui-svelte/tailwind.css";\n`
		);
	});

	it("url() and source()/layer() modifiers count as the tailwind import", () => {
		expect(twice(`@import url("tailwindcss") source(none);\n`)).toContain(
			`@import "fancy-ui-svelte/tailwind.css";`
		);
		expect(twice(`@import 'tailwindcss' layer(base);`)).toBe(
			`@import 'tailwindcss' layer(base);\n@import 'fancy-ui-svelte/tailwind.css';`
		);
	});

	it("split tailwind imports: after the last @import, before @plugin and the user's dark variant", () => {
		const css = [
			`/* app styles */`,
			`@import "tailwindcss/theme.css" layer(theme);`,
			`@import "tailwindcss/utilities.css" layer(utilities);`,
			`@import "./fonts.css";`,
			``,
			`@plugin "@tailwindcss/typography";`,
			`@custom-variant dark (&:where(.dark, .dark *));`,
			``,
			`/* keep me */`,
			`:root {   --brand: red; }`,
			``,
		].join("\n");
		const out = twice(css);
		expect(out).toBe(
			css.replace(`@import "./fonts.css";`, `@import "./fonts.css";\n@import "${FANCY_CSS}";`)
		);
		expect(out.indexOf(FANCY_CSS)).toBeLessThan(out.indexOf("@custom-variant"));
	});

	it("keeps CRLF line endings and everything else byte for byte", () => {
		const css = `@import "tailwindcss";\r\n\r\nbody { color: red }\r\n`;
		expect(twice(css)).toBe(
			`@import "tailwindcss";\r\n@import "fancy-ui-svelte/tailwind.css";\r\n\r\nbody { color: red }\r\n`
		);
	});

	it("leaves the file alone when the import is already there, whatever the quotes", () => {
		expect(
			addFancyImport(`@import "tailwindcss";\n@import 'fancy-ui-svelte/tailwind.css';\n`)
		).toBe(false);
		expect(
			addFancyImport(`@import 'tailwindcss';\n@import url(fancy-ui-svelte/tailwind.css);`)
		).toBe(false);
	});

	it("leaves files without tailwind alone", () => {
		expect(addFancyImport("")).toBe(false);
		expect(addFancyImport(`@import "./reset.css";\nbody{}`)).toBe(false);
		// a comment mentioning tailwind is not an import
		expect(addFancyImport(`/* @import "tailwindcss"; */\nbody{}`)).toBe(false);
		// nor is a lookalike package
		expect(addFancyImport(`@import "tailwindcss-animate";`)).toBe(false);
	});

	it("detectors", () => {
		expect(hasTailwindImport(`@import "tailwindcss";`)).toBe(true);
		expect(hasTailwindImport(`@import "tw-animate-css";`)).toBe(false);
		expect(hasFancyImport(`@import "${FANCY_CSS}";`)).toBe(true);
		expect(hasFancyImport(`@import "fancy-ui-react/tailwind.css";`)).toBe(false);
	});
});
