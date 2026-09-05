// @vitest-environment node
/**
 * Server-side safety net for the two id generators.
 *
 * Runs in the `node` environment, so there is no `window` and no `document` —
 * the condition both halves of this module are defined against. `useFancyId`
 * must produce a real id there (it is the SSR-stable one); `uid` must throw
 * rather than hand back a number the client will never regenerate.
 *
 * The import is dynamic and preceded by `vi.resetModules()` so the module is
 * evaluated *inside* the test run, with the node globals in place; a static
 * import would be hoisted and evaluated before any assertion could observe it.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

let mod: typeof import("./use-id.js");
let importError: unknown = null;

beforeAll(async () => {
	vi.resetModules();
	try {
		mod = await import("./use-id.js");
	} catch (error) {
		importError = error;
	}
});

describe("use-id on the server", () => {
	it("runs with no browser globals in scope", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
	});

	it("imports without touching a browser global", () => {
		expect(importError).toBeNull();
		expect(typeof mod.useFancyId).toBe("function");
		expect(typeof mod.uid).toBe("function");
	});

	it("renders a real, prefixed id through useFancyId", () => {
		function Probe() {
			return createElement("span", { id: mod.useFancyId(), "data-probe": "" });
		}

		const html = renderToString(createElement(Probe));

		expect(html).toMatch(/id="fui-[^"]+"/);
	});

	it("honours a custom prefix on the server too", () => {
		function Probe() {
			return createElement("span", { id: mod.useFancyId("tooltip") });
		}

		expect(renderToString(createElement(Probe))).toMatch(/id="tooltip-[^"]+"/);
	});

	it("throws instead of generating an id when `window` is unavailable", () => {
		expect(() => mod.uid()).toThrow(/client-only/);
	});
});
