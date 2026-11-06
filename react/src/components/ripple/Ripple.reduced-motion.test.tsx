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
import { Ripple } from "./Ripple.js";

const SRC = resolve(__dirname, "./ripple.css");

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

describe("Ripple reduced motion", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("still renders every ring, at full size, under reduce", () => {
		stubReduce();
		const { container } = render(<Ripple />);
		const rings = container.querySelectorAll(".animate-ripple-circle");
		expect(rings.length).toBe(7);
		for (const ring of rings) {
			expect((ring as HTMLElement).style.transform).toContain("scale(1)");
			expect(ring.className).toContain("motion-reduce:animate-none");
		}
	});

	it("only pulses under no-preference (the stylesheet rule itself is gated)", () => {
		const src = readFileSync(SRC, "utf8");
		expect(ungatedAnimations(src)).toEqual([]);
		expect(src).toContain("animation: ripple-effect");
	});
});
