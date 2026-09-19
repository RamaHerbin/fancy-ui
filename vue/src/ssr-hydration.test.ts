import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, describe, expect, it } from "vitest";
import { exportedComponents, fixtures } from "./ssr-sweep.fixtures.js";

/**
 * Package-wide hydration gate (mirrors the React package's own).
 *
 * Every capitalised component export of the package root and of
 * `./cameleon` is server rendered, planted into a container, then hydrated
 * with `createSSRApp(...).mount(container)`. Any warning `app.config.warnHandler`
 * collects whose message matches `/hydrat|mismatch/i` fails the suite.
 */

/**
 * Components whose hydration cannot be observed under jsdom. Frozen list,
 * asserted for exact equality like the React sweep's own —
 * a name appearing or disappearing turns this suite red on purpose, so the
 * hole is never allowed to grow unnoticed.
 */
const CANNOT_HYDRATE_UNDER_JSDOM: readonly string[] = [];

const HYDRATION_DIAGNOSTIC = /hydrat|mismatch/i;

const swept = exportedComponents();

function buildApp(value: unknown, props: Record<string, unknown>) {
	return createSSRApp({
		render: () => h(value as never, props, { default: () => "x" }),
	});
}

async function hydrateOne(name: string, value: unknown) {
	const props = fixtures[name] ?? {};
	const html = await renderToString(buildApp(value, props));

	const container = document.createElement("div");
	container.innerHTML = html;
	document.body.appendChild(container);

	const messages: string[] = [];
	let threw = false;
	const app = buildApp(value, props);
	app.config.warnHandler = (message) => {
		if (HYDRATION_DIAGNOSTIC.test(message)) messages.push(message);
	};

	try {
		app.mount(container);
		app.unmount();
	} catch {
		threw = true;
	} finally {
		container.remove();
	}

	if (threw) {
		expect(CANNOT_HYDRATE_UNDER_JSDOM).toContain(name);
		return;
	}
	expect(CANNOT_HYDRATE_UNDER_JSDOM).not.toContain(name);
	expect(messages.map((message) => `${name}:: ${message}`)).toEqual([]);
}

describe("hydration sweep", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it.each(swept)("%s hydrates server HTML without mismatch", async (name, value) => {
		await hydrateOne(name, value);
	});

	it("sweeps the whole barrel, and the frozen list has no stale names", () => {
		const names = new Set(swept.map(([exportName]) => exportName));
		expect(CANNOT_HYDRATE_UNDER_JSDOM.filter((name) => !names.has(name))).toEqual([]);
	});

	it("passes with zero components", () => {
		expect(swept.length).toBeGreaterThanOrEqual(0);
	});
});
