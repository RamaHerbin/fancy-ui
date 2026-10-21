/**
 * Focus under `prefers-reduced-motion: reduce`: the transitions are CSS-gated,
 * so the component must still move its active word, blur the others and keep
 * the frame visible and positioned: only the in-between animation goes away.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Focus from "./Focus.svelte";

describe("Focus under prefers-reduced-motion: reduce", () => {
	const originalMatchMedia = window.matchMedia;

	beforeEach(() => {
		window.matchMedia = ((query: string) => ({
			matches: query.includes("reduce") && !query.includes("no-preference"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		})) as unknown as typeof window.matchMedia;
	});

	afterEach(() => {
		cleanup();
		window.matchMedia = originalMatchMedia;
		vi.useRealTimers();
	});

	it("still moves the active word and keeps the frame visible and positioned (manual mode)", async () => {
		const { container } = render(Focus, {
			props: { sentence: "A B C", manualMode: true, blurAmount: 6 },
		});
		const words = container.querySelectorAll(".focus-word");
		await fireEvent.mouseEnter(words[2] as HTMLElement);
		await tick();
		expect((words[2] as HTMLElement).style.filter).toBe("blur(0px)");
		expect((words[0] as HTMLElement).style.filter).toBe("blur(6px)");
		const frame = container.querySelector(".focus-frame") as HTMLElement;
		expect(frame.style.opacity).toBe("1");
		expect(frame.style.transform).toContain("translate(");
	});

	it("still advances the active word on its timer (auto mode)", async () => {
		vi.useFakeTimers();
		const { container } = render(Focus, {
			props: { sentence: "A B", blurAmount: 6, animationDuration: 0.5, pauseBetweenAnimations: 1 },
		});
		const words = container.querySelectorAll(".focus-word");
		expect((words[0] as HTMLElement).style.filter).toBe("blur(0px)");
		await vi.advanceTimersByTimeAsync(1600);
		await tick();
		expect((words[1] as HTMLElement).style.filter).toBe("blur(0px)");
		expect((words[0] as HTMLElement).style.filter).toBe("blur(6px)");
	});
});

/**
 * jsdom cannot evaluate a media query, so the render tests above cannot tell a
 * gated transition from an ungated one. This control reads the component's own
 * stylesheet: the motion (`filter`, `all`) must be declared only inside
 * `@media (prefers-reduced-motion: no-preference)`. Removing the wrapper makes
 * it fail, which the render tests alone would not.
 */
describe("Focus CSS control: transitions exist only under no-preference", () => {
	function split(src: string) {
		const at = src.indexOf("@media (prefers-reduced-motion: no-preference)");
		expect(at).toBeGreaterThan(-1);
		let depth = 0;
		let end = -1;
		for (let i = src.indexOf("{", at); i < src.length; i++) {
			if (src[i] === "{") depth++;
			if (src[i] === "}" && --depth === 0) {
				end = i + 1;
				break;
			}
		}
		return { inside: src.slice(at, end), outside: src.slice(0, at) + src.slice(end) };
	}
	const src = readFileSync(resolve(__dirname, "./Focus.svelte"), "utf8");

	it("declares the word blur and frame glide inside the no-preference block", () => {
		const { inside } = split(src);
		expect(inside).toMatch(/transition:\s*all/);
		expect(inside).toMatch(/filter\s+var\(--focus-duration/);
	});

	it("declares no motion transition outside it", () => {
		const { outside } = split(src);
		expect(outside).not.toMatch(/transition:\s*all/);
		expect(outside).not.toMatch(/transition:\s*filter/);
		expect(outside).not.toMatch(/transition-duration/);
	});

	it("control: the same check flags the stylesheet once the wrapper is removed", () => {
		const unwrapped = src.replace(
			"@media (prefers-reduced-motion: no-preference)",
			"@media screen"
		);
		const { outside } = split(
			unwrapped.replace(
				"@media screen",
				"@media (prefers-reduced-motion: no-preference) { } @media screen"
			)
		);
		expect(outside).toMatch(/transition:\s*all/);
	});
});
