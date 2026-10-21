import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/fancy-ui/registry.js", () => ({
	getAllComponents: () => [
		{ slug: "alpha", name: "Alpha" },
		{ slug: "old-thing", name: "Old", deprecated: true },
	],
}));

import { getAllRecipes } from "$lib/docs/recipes/registry.js";
import { GET } from "./+server.js";

async function locs(): Promise<string[]> {
	const res = await (GET as unknown as () => Response)();
	const xml = await res.text();
	return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

describe("sitemap.xml", () => {
	it("lists the recipes index and every recipe", async () => {
		const urls = await locs();
		expect(urls.some((u) => u.endsWith("/docs/recipes"))).toBe(true);
		for (const { slug } of getAllRecipes()) {
			expect(urls.some((u) => u.endsWith(`/docs/recipes/${slug}`))).toBe(true);
		}
	});

	it("lists live components and leaves deprecated ones out", async () => {
		const urls = await locs();
		expect(urls.some((u) => u.endsWith("/docs/components/alpha"))).toBe(true);
		expect(urls.some((u) => u.endsWith("/docs/components/old-thing"))).toBe(false);
	});
});
