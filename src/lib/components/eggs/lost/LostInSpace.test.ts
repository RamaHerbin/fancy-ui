import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { slugsFromSitemap } from "./slugs.js";

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
	<url><loc>https://x.test/docs/components</loc></url>
	<url><loc>https://x.test/docs/components/button</loc></url>
	<url><loc>https://x.test/docs/components/meteors</loc></url>
	<url><loc>https://x.test/docs/recipes/hero</loc></url>
</urlset>
`;

const markFound = vi.fn();
const createEggsState = vi.fn((total: number, _countable?: string[]) => ({
	found: new Set<string>(),
	count: 0,
	total,
}));
vi.mock("../discovery.svelte.js", () => ({
	markFound: (id: string) => markFound(id),
	createEggsState: (total: number, countable?: string[]) => createEggsState(total, countable),
}));

const fetchMock = vi.fn(async () => new Response(SITEMAP, { status: 200 }));
beforeEach(() => {
	vi.stubGlobal("fetch", fetchMock);
});

import LostInSpace from "./LostInSpace.svelte";

afterEach(() => {
	cleanup();
	markFound.mockClear();
	fetchMock.mockClear();
	vi.unstubAllGlobals();
});

describe("LostInSpace", () => {
	it("parses component slugs out of the sitemap, ignoring the index and other pages", () => {
		expect(slugsFromSitemap(SITEMAP)).toEqual(["button", "meteors"]);
		expect(slugsFromSitemap("")).toEqual([]);
	});

	it("points the teleport link at a random component from the sitemap after mount", async () => {
		const { container } = render(LostInSpace);
		const link = container.querySelector<HTMLAnchorElement>('[data-egg="teleport"]')!;
		await waitFor(() => expect(link.getAttribute("href")).not.toBe("/docs/components"));
		expect(fetchMock).toHaveBeenCalledWith("/sitemap.xml");
		expect(["/docs/components/button", "/docs/components/meteors"]).toContain(
			link.getAttribute("href")
		);
		expect(container.textContent).toMatch(/0 \/ \d+ secrets found/);
	});

	it("keeps the index as the destination when the sitemap cannot be fetched", async () => {
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		const { container } = render(LostInSpace);
		await tick();
		await new Promise((r) => setTimeout(r, 0));
		const link = container.querySelector<HTMLAnchorElement>('[data-egg="teleport"]')!;
		expect(link.getAttribute("href")).toBe("/docs/components");
	});

	it("counts only the non-hidden eggs", () => {
		render(LostInSpace);
		const [, countable] = createEggsState.mock.calls.at(-1)!;
		expect(countable).toBeDefined();
		expect(countable).not.toContain("humans");
	});

	it("records the discovery on click", async () => {
		const { container } = render(LostInSpace);
		await tick();
		const link = container.querySelector<HTMLAnchorElement>('[data-egg="teleport"]')!;
		link.addEventListener("click", (e) => e.preventDefault());
		await fireEvent.click(link);
		expect(markFound).toHaveBeenCalledWith("lost");
	});
});
