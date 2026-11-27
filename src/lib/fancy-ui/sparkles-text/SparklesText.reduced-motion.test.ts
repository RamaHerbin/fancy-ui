import { render, cleanup } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, it, expect, vi } from "vitest";
import SparklesText from "./SparklesText.svelte";

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
	const file = readFileSync(resolve(__dirname, "./SparklesText.svelte"), "utf8");
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

describe("SparklesText reduced motion", () => {
	afterEach(cleanup);

	it("keeps motion declarations inside the no-preference gate", () => {
		const css = stylesheet();
		expect(ungatedCss(css)).not.toMatch(/animation|scale\(0\)/);
		expect(gatedCss(css)).toMatch(/opacity:\s*0[\s\S]*animation:\s*sparkleAnim/);
	});

	it("carries no inline animation or transition under either preference", () => {
		for (const reduce of [true, false]) {
			mockMatchMedia(reduce);
			const { container, unmount } = render(SparklesText, {
				props: { text: "X", sparklesCount: 2 },
			});
			for (const el of container.querySelectorAll("[style]")) {
				expect(el.getAttribute("style") ?? "").not.toMatch(/animation|transition/);
			}
			unmount();
		}
	});

	describe("sparkle timer", () => {
		/** The field's markup before and after 20 s, which outlives every lifespan. */
		async function fieldAfter20s(reduce: boolean): Promise<[string, string]> {
			mockMatchMedia(reduce);
			vi.useFakeTimers();
			try {
				const { container } = render(SparklesText, { props: { text: "X", sparklesCount: 3 } });
				const read = () =>
					Array.from(container.querySelectorAll(".sparkles-star"))
						.map((s) => s.getAttribute("style"))
						.join("|");
				const before = read();
				await vi.advanceTimersByTimeAsync(20000);
				return [before, read()];
			} finally {
				vi.useRealTimers();
			}
		}

		it("regenerates the field with no preference", async () => {
			const [before, after] = await fieldAfter20s(false);
			expect(after).not.toBe(before);
		});

		it("holds the field still under reduce", async () => {
			const [before, after] = await fieldAfter20s(true);
			expect(after).toBe(before);
		});
	});
});
