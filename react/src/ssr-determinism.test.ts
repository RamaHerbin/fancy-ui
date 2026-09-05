// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NEEDS_PROPS, exportedComponents, tree } from "./ssr-sweep.fixtures.js";

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
 *
 * One case per export rather than one case for the whole sweep, so a component
 * that diverges — or hangs — names itself instead of failing a single
 * three-minute case that says only that something, somewhere, went wrong.
 */

const swept = exportedComponents();

/** The sweep's coverage floor: the per-case assertions pass on empty input too. */
const CHECKED_FLOOR = 150;

describe("ssr determinism", () => {
	const checked: string[] = [];
	const skipped: string[] = [];

	it.each(swept)("%s renders identically twice", (name, value) => {
		let a: string;
		let b: string;
		try {
			a = renderToStaticMarkup(tree(value));
			b = renderToStaticMarkup(tree(value));
		} catch {
			// Needs props or a provider this sweep does not supply. Recorded rather
			// than dropped: the frozen list below is what stops the hole growing.
			skipped.push(name);
			expect(NEEDS_PROPS as readonly string[]).toContain(name);
			return;
		}
		checked.push(name);
		expect(NEEDS_PROPS as readonly string[]).not.toContain(name);
		expect(a).toEqual(b);
	});

	it("sweeps the whole barrel, and the frozen list has no stale names", () => {
		expect([...skipped].sort()).toEqual([...NEEDS_PROPS].sort());
		expect(checked.length).toBeGreaterThan(CHECKED_FLOOR);
	});
});
