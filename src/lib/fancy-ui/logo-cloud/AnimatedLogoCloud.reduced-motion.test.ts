/**
 * Reduced motion: the resting picture is the ungated default, the animation is
 * gated behind `prefers-reduced-motion: no-preference`. jsdom does not evaluate
 * stylesheet media queries, so the gate is asserted on the source and the
 * resting markup is asserted under a `reduce` preference.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import { AnimatedLogoCloud } from "./index";

const SRC = resolve(__dirname, "./AnimatedLogoCloud.svelte");

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
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: query.includes("reduce") && !query.includes("no-preference"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}),
	});
}

const logos = [
	{ name: "Svelte", path: "/svelte.svg" },
	{ name: "React", path: "/react.svg" },
];

describe("AnimatedLogoCloud reduced motion", () => {
	afterEach(() => {
		cleanup();
	});

	it("still renders every logo group, in place, under reduce", () => {
		stubReduce();
		const { container } = render(AnimatedLogoCloud, { props: { logos } });
		expect(container.querySelectorAll(".logo-cloud-scroll").length).toBe(5);
		expect(container.querySelectorAll("img").length).toBe(5 * logos.length);
	});

	it("only scrolls under no-preference and pauses on focus-within", () => {
		const src = readFileSync(SRC, "utf8");
		expect(ungatedAnimations(src)).toEqual([]);
		expect(src).toContain("animation: logo-cloud-scroll");
		expect(src).toMatch(
			/:focus-within\s+\.logo-cloud-scroll\s*\{\s*animation-play-state:\s*paused/
		);
	});
});
