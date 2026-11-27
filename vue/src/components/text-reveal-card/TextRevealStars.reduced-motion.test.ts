/**
 * Reduced motion: the resting picture is the ungated default, the animation is
 * gated behind `prefers-reduced-motion: no-preference`. jsdom does not evaluate
 * stylesheet media queries, so the gate is asserted on the source and the
 * resting markup is asserted under a `reduce` preference.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import TextRevealStars from "./TextRevealStars.vue";

const SRC = resolve(__dirname, "./TextRevealStars.vue");

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

describe("TextRevealStars reduced motion", () => {
	afterEach(() => {
		cleanup();
	});

	it("still renders the stars under reduce, with a size container and a transform drift", () => {
		stubReduce();
		const { container } = render(TextRevealStars, { props: { starsCount: 20 } });
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.style.containerType || wrapper.getAttribute("style")).toMatch(/size/);
		const stars = container.querySelectorAll(".star-animate");
		expect(stars.length).toBe(20);
		for (const star of stars) {
			const el = star as HTMLElement;
			expect(el.style.getPropertyValue("--drift-x")).toMatch(/cqw/);
			expect(el.style.getPropertyValue("--drift-y")).toMatch(/cqh/);
			expect(el.style.getPropertyValue("--star-opacity")).not.toBe("");
		}
	});

	it("drifts only under no-preference, through transform rather than top/left", () => {
		const src = readFileSync(SRC, "utf8");
		expect(ungatedAnimations(src)).toEqual([]);
		const from = src.indexOf("@keyframes star-drift");
		const keyframes = src.slice(from, src.indexOf(".star-animate", from));
		expect(from).toBeGreaterThan(-1);
		expect(keyframes).toContain("translate(var(--drift-x), var(--drift-y))");
		expect(keyframes).not.toMatch(/(^|\s)(top|left)\s*:/);
	});
});
