import { expect, test, type Page } from "@playwright/test";

// The framework choice is client state read after mount, so interactions wait
// for hydration instead of racing the prerendered (Svelte) HTML.
async function hydrated(page: Page) {
	await page.waitForLoadState("networkidle");
}

async function pick(page: Page, name: "React" | "Svelte" | "Vue") {
	const radio = page.getByRole("radio", { name }).first();
	await radio.click();
	await expect(radio).toHaveAttribute("aria-checked", "true");
}

test.describe("Docs follow the selected framework", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => localStorage.removeItem("fancy-ui-framework"));
	});

	test("component usage switches to React, then Vue", async ({ page }) => {
		await page.goto("/docs/components/rainbow-button");
		await hydrated(page);

		const usage = page.locator("section:has(h2#usage)");
		await expect(usage).toContainText("fancy-ui-svelte");

		await pick(page, "React");
		await expect(usage).toContainText("fancy-ui-react");
		await expect(usage).not.toContainText("<script");
		await expect(usage).not.toContainText("fancy-ui-svelte");
		// No Svelte source anywhere on the page, examples section included.
		await expect(page.locator("main")).not.toContainText("<script");

		await pick(page, "Vue");
		await expect(usage).toContainText("fancy-ui-vue");
		await expect(usage).not.toContainText("fancy-ui-react");
	});

	test("the Code tab follows the framework and the source link follows the port", async ({
		page,
	}) => {
		await page.goto("/docs/components/rainbow-button");
		await hydrated(page);
		await pick(page, "React");

		await page
			.locator("section:has(h2#preview)")
			.getByRole("button", { name: "Code", exact: true })
			.first()
			.click();
		await expect(page.locator("section:has(h2#preview) .docs-code").first()).toContainText(
			"fancy-ui-react"
		);
		await expect(page.locator('a[href*="/react/src/components/rainbow-button"]')).toBeVisible();
	});

	test("installation page switches stylesheet and peer dependencies", async ({ page }) => {
		await page.goto("/docs/getting-started/installation");
		await hydrated(page);
		await expect(page.locator("main")).toContainText("fancy-ui-svelte/tailwind.css");

		await pick(page, "React");
		await expect(page.locator("main")).toContainText("fancy-ui-react/tailwind.css");
		await expect(page.locator("main")).not.toContainText("fancy-ui-svelte/tailwind.css");
		await expect(page.locator(".peer-table")).toContainText("react-dom");

		await pick(page, "Vue");
		await expect(page.locator("main")).toContainText("fancy-ui-vue/styles.css");
		await expect(page.locator(".peer-table")).not.toContainText("react-dom");
	});

	test("a component without a full example says so instead of showing other code", async ({
		page,
	}) => {
		await page.goto("/docs/components/border-beam");
		await hydrated(page);
		await pick(page, "React");

		const usage = page.locator("section:has(h2#usage)");
		await expect(usage.locator("[data-snippet-missing]")).toBeVisible();
		await expect(usage).not.toContainText("<script");

		// The example previews stay, their Svelte code does not.
		await expect(page.locator("main")).not.toContainText("<script");
		await expect(page.locator("main")).not.toContainText("fancy-ui-svelte");
		const examples = page.locator("section:has(h2#examples)");
		await expect(examples.locator("[data-snippet-missing]")).toBeVisible();
		await expect(examples.getByRole("button", { name: "Code", exact: true })).toHaveCount(0);
	});

	test("Markdown export is labelled Svelte-only and the API notice follows the framework", async ({
		page,
	}) => {
		await page.goto("/docs/components/rainbow-button");
		await hydrated(page);
		await expect(page.locator("[data-markdown-copy]")).toContainText("Copy as Markdown");
		await expect(page.locator("[data-markdown-copy]")).not.toContainText("(Svelte)");
		await expect(page.locator("[data-api-notice]")).toHaveCount(0);

		await pick(page, "React");
		await expect(page.locator("[data-markdown-copy]")).toContainText("Copy as Markdown (Svelte)");
		await expect(page.getByRole("link", { name: /^\.md \(Svelte\)/ })).toBeVisible();
		const notice = page.locator("[data-api-notice]");
		await expect(notice).toContainText("className");
		await expect(notice.getByRole("link")).toHaveAttribute(
			"href",
			/react\/README\.md#divergences-from-the-svelte-api$/
		);

		await pick(page, "Vue");
		await expect(notice).toContainText("v-model");
		await expect(notice.getByRole("link")).toHaveAttribute("href", /vue\/README\.md#/);
	});

	test("a shared ?framework=react link opens on React without a click", async ({ page }) => {
		// A saved Vue preference loses to the link.
		await page.addInitScript(() => localStorage.setItem("fancy-ui-framework", "vue"));
		await page.goto("/docs/components/button?framework=react");
		await hydrated(page);

		await expect(page.getByRole("radio", { name: "React" }).first()).toHaveAttribute(
			"aria-checked",
			"true"
		);
		const usage = page.locator("section:has(h2#usage)");
		await expect(usage).toContainText("fancy-ui-react");
		await expect(usage).not.toContainText("fancy-ui-svelte");
		expect(await page.evaluate(() => localStorage.getItem("fancy-ui-framework"))).toBe("react");
	});

	test("switching writes the framework to the URL in place", async ({ page }) => {
		await page.goto("/docs/components/button");
		await hydrated(page);
		const entries = await page.evaluate(() => history.length);

		await pick(page, "Vue");
		await expect(page).toHaveURL(/\/docs\/components\/button\?framework=vue$/);
		await pick(page, "React");
		await expect(page).toHaveURL(/\/docs\/components\/button\?framework=react$/);
		expect(await page.evaluate(() => history.length)).toBe(entries);

		// The address is now a link that reopens the page the same way.
		await page.reload();
		await hydrated(page);
		await expect(page.locator("section:has(h2#usage)")).toContainText("fancy-ui-react");
	});

	test("the API tables show the port names next to the Svelte names", async ({ page }) => {
		await page.goto("/docs/components/button?framework=react");
		await hydrated(page);

		const props = page.locator("section:has(h2#props)");
		const classRow = props.locator("tbody tr", {
			has: page.locator("code", { hasText: /^class$/ }),
		});
		await expect(classRow.locator('[data-port-name="react"]')).toHaveText("className");
		const clickRow = props.locator("tbody tr", {
			has: page.locator("code", { hasText: /^onclick$/ }),
		});
		await expect(clickRow.locator('[data-port-name="react"]')).toHaveText("onClick");
		// The notice pointing at the written differences stays.
		await expect(page.locator("[data-api-notice]")).toBeVisible();

		await pick(page, "Vue");
		const slots = page.locator("section:has(h2#slots)");
		const childrenRow = slots.locator("tbody tr", {
			has: page.locator("code", { hasText: /^children$/ }),
		});
		await expect(childrenRow.locator('[data-port-name="vue"]')).toHaveText("#default");
		await expect(classRow.locator("[data-port-name]")).toHaveCount(0);

		await pick(page, "Svelte");
		await expect(page.locator("[data-port-name]")).toHaveCount(0);
	});

	test("the Markdown export link carries the framework", async ({ page }) => {
		await page.goto("/docs/components/button?framework=react");
		await hydrated(page);
		await expect(page.locator("[data-markdown-link]")).toHaveAttribute(
			"href",
			"/docs/components/button.md?framework=react"
		);
		await pick(page, "Vue");
		await expect(page.locator("[data-markdown-link]")).toHaveAttribute(
			"href",
			"/docs/components/button.md?framework=vue"
		);
	});

	test("an open Code tab falls back to the preview when switching to React", async ({ page }) => {
		await page.goto("/docs/components/rainbow-button");
		await hydrated(page);
		const examples = page.locator("section:has(h2#examples)");
		await examples.getByRole("button", { name: "Code", exact: true }).first().click();
		await pick(page, "React");
		await expect(examples.getByRole("button", { name: "Code", exact: true })).toHaveCount(0);
		await expect(examples.locator('[data-pane="preview"]').first()).toBeVisible();
	});
});
