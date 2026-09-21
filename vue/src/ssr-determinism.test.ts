// @vitest-environment node
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import * as pkg from "./index.js";
import { exportedComponents, fixtures, PROVIDER_ONLY, PROVIDER_ERROR } from "./ssr-sweep.fixtures.js";

/**
 * Package-wide render-purity gate (mirrors the React package's own): a
 * component's server HTML must be a pure function of its props. Every
 * capitalised component export of the package root and of `./cameleon` is
 * server rendered twice; the two strings must be identical.
 *
 * Runs in the node environment, with no DOM globals, so a component that
 * touches `window` during render fails to render at all rather than quietly
 * succeeding against jsdom.
 */

const swept = exportedComponents();

async function renderTwice(value: unknown, props: Record<string, unknown>) {
	const build = () =>
		renderToString(
			createSSRApp({
				render: () => h(value as never, props, { default: () => "x" }),
			})
		);
	return Promise.all([build(), build()]);
}

/**
 * Ratchet: the sweep's coverage floor. Zero until the first migration wave
 * lands a component; each wave that adds rendered exports raises this
 * constant to the new count it actually swept.
 */
const RENDERED_FLOOR = 0;

describe("ssr determinism", () => {
	it.each(swept)("%s renders identically twice", async (name, value) => {
		if (PROVIDER_ONLY.has(name)) {
			// A compound sub-component: standalone it must refuse to render with the
			// provider error, the same misuse crash the Svelte source has.
			await expect(renderTwice(value, fixtures[name] ?? {})).rejects.toThrow(PROVIDER_ERROR);
			return;
		}
		const [a, b] = await renderTwice(value, fixtures[name] ?? {});
		expect(a).toEqual(b);
	});

	it("sweeps the whole barrel", () => {
		expect(swept.length).toBeGreaterThanOrEqual(RENDERED_FLOOR);
	});

	it("exports cn from the root barrel", () => {
		expect(typeof pkg.cn).toBe("function");
	});
});
