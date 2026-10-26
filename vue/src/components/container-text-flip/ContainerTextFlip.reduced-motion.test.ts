import { render, cleanup } from "@testing-library/vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, it, expect, vi } from "vitest";
import ContainerTextFlip from "./ContainerTextFlip.vue";

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
	const file = readFileSync(resolve(__dirname, "./ContainerTextFlip.vue"), "utf8");
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

describe("ContainerTextFlip reduced motion", () => {
	afterEach(cleanup);

	it("keeps motion declarations inside the no-preference gate", () => {
		const css = stylesheet();
		expect(ungatedCss(css)).not.toMatch(/animation|opacity:\s*0(?![.\d])|blur/);
		expect(gatedCss(css)).toMatch(/text-flip-letter[\s\S]*animation:\s*text-flip-in/);
	});

	it("carries no inline animation or transition under either preference", () => {
		for (const reduce of [true, false]) {
			mockMatchMedia(reduce);
			const { container, unmount } = render(ContainerTextFlip, {
				props: { words: ["Alpha", "Beta"] },
			});
			for (const el of container.querySelectorAll("[style]")) {
				expect(el.getAttribute("style") ?? "").not.toMatch(/animation(-name)?:|transition/);
			}
			unmount();
		}
	});

	describe("word cycle", () => {
		async function wordAfter(reduce: boolean): Promise<string> {
			mockMatchMedia(reduce);
			vi.useFakeTimers();
			try {
				const { container } = render(ContainerTextFlip, { props: { words: ["Alpha", "Beta"] } });
				await vi.advanceTimersByTimeAsync(3100);
				return container.querySelector("p")?.textContent ?? "";
			} finally {
				vi.useRealTimers();
			}
		}

		it("cycles to the next word with no preference", async () => {
			expect(await wordAfter(false)).toBe("Beta");
		});

		it("keeps the current word under reduce", async () => {
			expect(await wordAfter(true)).toBe("Alpha");
		});
	});
});
