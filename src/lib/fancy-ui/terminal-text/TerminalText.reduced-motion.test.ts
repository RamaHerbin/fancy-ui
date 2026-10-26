import { render, cleanup } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, it, expect, vi } from "vitest";
import TerminalText from "./TerminalText.svelte";

function mockMatchMedia(reduce: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: reduce && query.includes("reduce") && !query.includes("no-preference"),
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

/** Source text of the stylesheet(s) that ship with the component. */
function stylesheet(): string {
	const file = readFileSync(resolve(__dirname, "./TerminalText.svelte"), "utf8");
	return [...file.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
}

/** CSS with every `@keyframes` block and every `no-preference` gate removed:
 * what is left applies to ALL users, reduced motion included. */
function ungatedCss(source: string): string {
	const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
	let out = "";
	let i = 0;
	while (i < css.length) {
		const open = css.indexOf("{", i);
		if (open === -1) {
			out += css.slice(i);
			break;
		}
		const prelude = css.slice(i, open).trim();
		let depth = 1;
		let j = open + 1;
		while (j < css.length && depth > 0) {
			if (css[j] === "{") depth++;
			else if (css[j] === "}") depth--;
			j++;
		}
		const body = css.slice(open + 1, j - 1);
		if (
			/^@keyframes/.test(prelude) ||
			/^@media\s*\(prefers-reduced-motion:\s*no-preference\)/.test(prelude)
		) {
			// removed: inert declaration or the gate itself
		} else if (prelude.startsWith("@") || prelude === ":global") {
			out += ungatedCss(body);
		} else {
			out += `${prelude}{${body}}`;
		}
		i = j;
	}
	return out;
}

/** The text inside every `no-preference` gate. */
function gatedCss(source: string): string {
	const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
	const re = /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g;
	let out = "";
	for (let m = re.exec(css); m; m = re.exec(css)) {
		let depth = 1;
		let j = m.index + m[0].length;
		const start = j;
		while (j < css.length && depth > 0) {
			if (css[j] === "{") depth++;
			else if (css[j] === "}") depth--;
			j++;
		}
		out += css.slice(start, j - 1);
	}
	return out;
}

describe("TerminalText reduced motion", () => {
	afterEach(cleanup);

	it("keeps motion declarations inside the no-preference gate", () => {
		const css = stylesheet();
		expect(ungatedCss(css)).not.toMatch(/animation:/);
		expect(gatedCss(css)).toMatch(/\.cursor-blink[\s\S]*animation:\s*blink/);
	});

	it("carries no inline animation or transition under either preference", () => {
		for (const reduce of [true, false]) {
			mockMatchMedia(reduce);
			const { container, unmount } = render(TerminalText, { props: { lines: ["hi"] } });
			for (const el of container.querySelectorAll("[style]")) {
				expect(el.getAttribute("style") ?? "").not.toMatch(/animation|transition/);
			}
			unmount();
		}
	});

	describe("streaming", () => {
		const lines = ["hello", "world"];

		it("types line by line with no preference", async () => {
			mockMatchMedia(false);
			vi.useFakeTimers();
			try {
				const onComplete = vi.fn();
				const { container } = render(TerminalText, { props: { lines, delay: 100, onComplete } });
				await vi.advanceTimersByTimeAsync(150);
				expect(container.textContent).not.toContain("world");
				expect(onComplete).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it("shows every line and completes once, at the delay, under reduce", async () => {
			mockMatchMedia(true);
			vi.useFakeTimers();
			try {
				const onComplete = vi.fn();
				const { container } = render(TerminalText, { props: { lines, delay: 100, onComplete } });
				await vi.advanceTimersByTimeAsync(99);
				expect((container.textContent ?? "").trim()).toBe("");
				expect(onComplete).not.toHaveBeenCalled();
				await vi.advanceTimersByTimeAsync(1);
				expect(container.textContent).toContain("hello");
				expect(container.textContent).toContain("world");
				expect(onComplete).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});

		it("never glitches the text under reduce", async () => {
			mockMatchMedia(true);
			vi.useFakeTimers();
			try {
				const { container } = render(TerminalText, { props: { lines, delay: 100, glitch: true } });
				await vi.advanceTimersByTimeAsync(100);
				const settled = container.textContent;
				await vi.advanceTimersByTimeAsync(20000);
				expect(container.textContent).toBe(settled);
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
