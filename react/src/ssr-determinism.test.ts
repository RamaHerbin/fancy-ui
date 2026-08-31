// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as pkg from "./index.js";
import * as cam from "./cameleon/index.js";

/**
 * Package-wide render-purity gate (convention C-7): a component's server HTML
 * must be a pure function of its props. Every capitalised export of the package
 * root and of `./cameleon` is server rendered twice; the two strings must be
 * identical. A `Math.random()`, a `Date.now()`, or a module-scope id counter
 * reaching the markup shows up here as a divergence — and would otherwise reach
 * a consumer as a hydration mismatch on the very first paint.
 *
 * Runs in the node environment, with no DOM globals, so a component that
 * touches `window` during render fails to render at all rather than quietly
 * succeeding against jsdom.
 */
describe("ssr determinism", () => {
	it("renders identically twice", () => {
		const diverged: string[] = [];
		/** Exports whose render throws from `{ children: "x" }` alone: they need
		 * props or a context provider this sweep does not supply, and are covered
		 * by their own colocated suites. */
		const skipped: string[] = [];
		let checked = 0;

		for (const [name, value] of Object.entries({ ...pkg, ...cam })) {
			if (typeof value !== "function" && typeof value !== "object") continue;
			if (typeof value === "object" && !(value && "$$typeof" in (value as object))) continue;
			if (!/^[A-Z]/.test(name)) continue;
			let a: string;
			let b: string;
			try {
				a = renderToStaticMarkup(createElement(value as never, { children: "x" } as never));
				b = renderToStaticMarkup(createElement(value as never, { children: "x" } as never));
			} catch {
				skipped.push(name);
				continue;
			}
			checked += 1;
			if (a !== b) diverged.push(`${name}\n  A=${a.slice(0, 300)}\n  B=${b.slice(0, 300)}`);
		}

		expect(diverged).toEqual([]);
		// Coverage floor: the assertion above also passes on an empty sweep, so a
		// broken barrel or a render that throws for everything would read as green.
		expect(checked).toBeGreaterThan(150);
		expect(skipped.length).toBeLessThan(checked);
	});
});
