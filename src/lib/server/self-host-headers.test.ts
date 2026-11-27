import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { headersFor, loadHeaderRules } from "../../../server/headers.mjs";

/**
 * The self-hosted server reads its response headers from vercel.json. These
 * cases pin the paths each rule is meant to cover, so a pattern the converter
 * cannot express fails here and not silently in production.
 */
const rules = loadHeaderRules(resolve(process.cwd(), "vercel.json"));
const keys = (pathname: string): Record<string, string> =>
	Object.fromEntries(headersFor(rules, pathname));

describe("self-hosted response headers", () => {
	it.each([
		"/llms.txt",
		"/llms-full.txt",
		"/registry.json",
		"/r/registry.json",
		"/r/button.json",
		"/r/svelte/button.json",
		"/r/vue/registry.json",
		"/docs/components/button.md",
		"/docs/components/react/button.md",
	])("marks %s as noindex", (pathname) => {
		expect(keys(pathname)["X-Robots-Tag"]).toBe("noindex");
	});

	it("caches fonts as immutable", () => {
		expect(keys("/fonts/Geist-Variable.woff2")["Cache-Control"]).toBe(
			"public, max-age=31536000, immutable"
		);
	});

	it.each([
		"/",
		"/docs/components/button",
		"/sitemap.xml",
		"/llmsxtxt",
		"/registryXjson",
		"/rx/button.json",
	])("sets nothing on %s", (pathname) => {
		expect(headersFor(rules, pathname)).toEqual([]);
	});
});
