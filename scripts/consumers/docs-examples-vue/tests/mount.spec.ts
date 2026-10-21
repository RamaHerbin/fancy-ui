import { expect, test } from "@playwright/test";
import { collectErrors } from "../../../../examples/consumers/smoke-helpers";

type Result = { name: string; html: number; problems: string[] };

// Every vue/docs-examples snippet, mounted from the packed fancy-ui-vue.
test("every docs example mounts without a Vue warning or error", async ({ page }) => {
	const errors = collectErrors(page);
	await page.goto("/");
	await expect(page.locator("html")).toHaveAttribute("data-docs-examples-ready", "true");

	const results = await page.evaluate(
		() => (window as unknown as { __docsExamples: Result[] }).__docsExamples
	);

	const expected = Number(process.env.DOCS_EXAMPLES_COUNT ?? 0);
	expect(expected, "DOCS_EXAMPLES_COUNT is set by docs-examples-vue.mjs").toBeGreaterThan(0);
	expect(results).toHaveLength(expected);

	for (const r of results) {
		expect(r.problems, `${r.name}: Vue problems`).toEqual([]);
		expect(r.html, `${r.name}: rendered something`).toBeGreaterThan(0);
	}
	expect(errors).toEqual([]);
});
