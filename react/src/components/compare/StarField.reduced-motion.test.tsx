/**
 * Reduced motion: the resting picture is the ungated default, the animation is
 * gated behind `prefers-reduced-motion: no-preference`. jsdom does not evaluate
 * stylesheet media queries, so the gate is asserted on the source and the
 * resting markup is asserted under a `reduce` preference.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { StarField } from "./StarField.js";

const SRC = resolve(__dirname, "./star-field.css");

/** Is the character at `at` inside a `@media (prefers-reduced-motion: no-preference)` block? */
function insideNoPreference(css: string, at: number): boolean {
	const re = /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g;
	for (const m of css.matchAll(re)) {
		let depth = 1;
		for (let i = m.index + m[0].length; i < css.length && depth > 0; i++) {
			if (css[i] === "{") depth++;
			else if (css[i] === "}") depth--;
			if (i === at) return depth > 0;
		}
	}
	return false;
}

/** Every `animation:` shorthand in the stylesheet must sit inside the gate. */
function ungatedAnimations(source: string): string[] {
	const css = source.replace(/\/\*[\s\S]*?\*\//g, (c) => " ".repeat(c.length));
	const out: string[] = [];
	for (const m of css.matchAll(/(?<![\w-])animation\s*:/g)) {
		if (!insideNoPreference(css, m.index)) out.push(css.slice(m.index, m.index + 40));
	}
	return out;
}

function stubReduce(): void {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query.includes("reduce") && !query.includes("no-preference"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("StarField reduced motion", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("still renders the star field, each star at its resting opacity, under reduce", () => {
		stubReduce();
		const { container } = render(<StarField />);
		const stars = container.querySelectorAll(".star");
		expect(stars.length).toBe(130);
		for (const star of stars) {
			expect((star as HTMLElement).style.getPropertyValue("--fancy-ui-opacity-start")).not.toBe("");
		}
	});

	it("twinkles and drifts only under no-preference; the resting opacity is ungated", () => {
		const src = readFileSync(SRC, "utf8");
		expect(ungatedAnimations(src)).toEqual([]);
		expect(src).toContain("twinkle var(--fancy-ui-twinkle-duration)");
		expect(src).toMatch(/\.star\s*\{\s*opacity:\s*var\(--fancy-ui-opacity-start\);\s*\}/);
	});
});
