/**
 * Reduced motion: the 0.4s settle after the pointer leaves lives in a class whose
 * `transition` sits inside `@media (prefers-reduced-motion: no-preference)`, so under
 * reduce the reveal snaps back. jsdom does not evaluate stylesheet media queries, so the
 * gate is asserted on the source and the markup is asserted under a `reduce` preference:
 * the layers never carry an inline `transition`, and the class is off while hovering.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import TextRevealCard from "./TextRevealCard.svelte";

/** jsdom ships no PointerEvent: a mouse event of the pointer type carries `pointerType`. */
function firePointer(
	el: Element,
	type: string,
	init: { clientX?: number; pointerType?: string } = {}
) {
	const event = new MouseEvent(type, {
		bubbles: !/enter|leave/.test(type),
		clientX: init.clientX,
	});
	Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" });
	el.dispatchEvent(event);
}

const SRC = resolve(__dirname, "./TextRevealCard.svelte");

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

/** Every `transition:` shorthand in the stylesheet must sit inside the gate. */
function ungatedTransitions(source: string): string[] {
	const css = source.replace(/\/\*[\s\S]*?\*\//g, (c) => " ".repeat(c.length));
	const out: string[] = [];
	for (const m of css.matchAll(/(?<![\w-])transition\s*:/g)) {
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

function layers(container: HTMLElement): HTMLElement[] {
	return [
		container.querySelector(".z-20") as HTMLElement,
		container.querySelector(".z-50") as HTMLElement,
	];
}

describe("TextRevealCard reduced motion", () => {
	afterEach(() => {
		cleanup();
	});

	it("keeps the settle transition inside the no-preference gate", () => {
		const src = readFileSync(SRC, "utf8");
		expect(src).toContain("text-reveal-settle");
		expect(ungatedTransitions(src)).toEqual([]);
	});

	it("never writes an inline transition and drops the settle class while hovering", async () => {
		stubReduce();
		const { container } = render(TextRevealCard);
		const card = container.firstElementChild as HTMLElement;
		for (const el of layers(container)) {
			expect(el.style.transition).toBe("");
			expect(el.classList.contains("text-reveal-settle")).toBe(true);
		}
		firePointer(card, "pointerenter");
		await tick();
		for (const el of layers(container)) {
			expect(el.style.transition).toBe("");
			expect(el.classList.contains("text-reveal-settle")).toBe(false);
		}
		firePointer(card, "pointerleave");
		await tick();
		for (const el of layers(container)) {
			expect(el.style.transition).toBe("");
			expect(el.classList.contains("text-reveal-settle")).toBe(true);
		}
	});
});
