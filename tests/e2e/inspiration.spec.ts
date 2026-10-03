import { expect, test, type Page } from "@playwright/test";

/**
 * /inspiration end to end: URL state, history, the saved store, the single
 * live stage, the copy brief and the layout at three widths.
 */

async function open(page: Page, path: string) {
	await page.goto(path);
	await page.locator("main[data-ready]").waitFor();
}

const cards = (page: Page) => page.locator("article.ic");

test.describe("inspiration gallery", () => {
	test("a deep link applies its filter after hydration", async ({ page }) => {
		await open(page, "/inspiration?style=glow");
		const count = await cards(page).count();
		expect(count).toBeGreaterThan(0);
		const styles = await cards(page).evaluateAll((nodes) =>
			nodes.map((node) => (node as HTMLElement).dataset.styles ?? "")
		);
		for (const list of styles) expect(list.split(" ")).toContain("glow");
		await expect(page.getByRole("button", { name: /Remove filter Style: Glow/ })).toBeVisible();
		await expect(page.locator('[data-facet-value="glow"]')).toHaveAttribute("aria-pressed", "true");
		const all = await page.locator("p.count").textContent();
		expect(all).toMatch(new RegExp(`^\\s*${count} of \\d+`));
	});

	test("a facet toggle writes the URL and Back restores it", async ({ page }) => {
		await open(page, "/inspiration");
		const total = await cards(page).count();
		await page.locator('[data-facet-value="press"]').click();
		await expect(page).toHaveURL(/\/inspiration\?interaction=press$/);
		await expect.poll(() => cards(page).count()).toBeLessThan(total);
		await page.goBack();
		await expect(page).toHaveURL(/\/inspiration$/);
		await expect.poll(() => cards(page).count()).toBe(total);
		await expect(page.locator('[data-facet-value="press"]')).toHaveAttribute(
			"aria-pressed",
			"false"
		);
	});

	test("typing updates ?q= with a single history entry", async ({ page }) => {
		await open(page, "/inspiration");
		const before = await page.evaluate(() => history.length);
		const field = page.getByRole("searchbox", { name: "Search inspiration" });
		await field.click();
		await field.pressSequentially("beam", { delay: 60 });
		await expect(page).toHaveURL(/\?q=beam$/);
		await field.pressSequentially("s", { delay: 60 });
		await expect(page).toHaveURL(/\?q=beams$/);
		await field.press("Backspace");
		await expect(page).toHaveURL(/\?q=beam$/);
		expect(await page.evaluate(() => history.length)).toBe(before + 1);
		await expect(field).toBeFocused();
		await page.goBack();
		await expect(page).toHaveURL(/\/inspiration$/);
		await expect(field).toHaveValue("");
	});

	test("saving a card does not navigate and survives a reload on the saved page", async ({
		page,
	}) => {
		await open(page, "/inspiration");
		const first = cards(page).first();
		const title = (await first.locator("h3").textContent())!.trim();
		await first.hover();
		await first.getByRole("button", { name: `Save ${title}` }).click();
		await expect(page).toHaveURL(/\/inspiration$/);
		await expect(first.getByRole("button", { name: `Save ${title}` })).toHaveAttribute(
			"aria-pressed",
			"true"
		);
		await open(page, "/inspiration/saved");
		await page.reload();
		await page.locator("main[data-ready]").waitFor();
		await expect(page.locator("article.ic h3")).toHaveText([title]);
		await page.getByRole("button", { name: "Clear all" }).click();
		await expect(page.getByText("Nothing saved yet")).toBeVisible();
	});

	test("keyboard: Tab reaches a save button and Enter toggles it", async ({ page }) => {
		await open(page, "/inspiration");
		const save = cards(page).first().locator("button.save");
		await cards(page).first().locator("h3 a").focus();
		for (let i = 0; i < 5; i++) {
			if (await save.evaluate((el) => el === document.activeElement)) break;
			await page.keyboard.press("Shift+Tab");
		}
		await expect(save).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(save).toHaveAttribute("aria-pressed", "true");
		await expect(page).toHaveURL(/\/inspiration$/);
		await page.keyboard.press("Enter");
		await expect(save).toHaveAttribute("aria-pressed", "false");
	});

	test("hovering a second card hands the live stage over", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await open(page, "/inspiration");
		const mounted = page.locator("[data-demo-mounted]");
		await cards(page).nth(0).hover();
		await expect(mounted).toHaveCount(1);
		await expect(
			page.locator('[data-stage="' + (await slugOf(page, 0)) + '"] [data-demo-mounted]')
		).toHaveCount(1);
		await cards(page).nth(1).hover();
		await expect(
			page.locator('[data-stage="' + (await slugOf(page, 1)) + '"] [data-demo-mounted]')
		).toHaveCount(1);
		// The first one unmounts after its short hysteresis.
		await expect(mounted).toHaveCount(1, { timeout: 3000 });
		await page.keyboard.press("Escape");
		await expect(mounted).toHaveCount(0, { timeout: 3000 });
	});

	for (const [width, height] of [
		[390, 844],
		[768, 1024],
		[1440, 900],
	]) {
		test(`no horizontal overflow at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height });
			for (const path of ["/inspiration", "/inspiration/pulse-beam", "/inspiration/saved"]) {
				await page.goto(path);
				await page.waitForLoadState("networkidle");
				const overflow = await page.evaluate(
					() => document.documentElement.scrollWidth - window.innerWidth
				);
				expect(overflow, path).toBeLessThanOrEqual(0);
			}
		});
	}
});

async function slugOf(page: Page, index: number) {
	return (await cards(page).nth(index).getAttribute("data-slug"))!;
}

test.describe("inspiration detail", () => {
	test("a published reference renders and an unknown one is a 404", async ({ page, request }) => {
		const ok = await page.goto("/inspiration/pulse-beam");
		expect(ok?.status()).toBe(200);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText("Composer — pulse beam");
		await expect(page.getByRole("heading", { name: "Use in FancyUI" })).toBeVisible();
		const missing = await request.get("/inspiration/nope");
		expect(missing.status()).toBe(404);
	});

	test("the variant panel follows the framework switch and never prints a Vue install", async ({
		page,
	}) => {
		await page.goto("/inspiration/pulse-beam");
		await page.waitForLoadState("networkidle");
		const panel = page.locator("section.vp");
		await panel.getByRole("radio", { name: "React" }).click();
		await expect(panel).toContainText("pnpm add fancy-ui-react");
		await expect(panel).not.toContainText("fancy-ui-svelte");
		await panel.getByRole("radio", { name: "Vue" }).click();
		await expect(panel).toContainText('from "fancy-ui-vue"');
		await expect(panel).not.toContainText("pnpm add fancy-ui-vue");
		await expect(panel).toContainText("not on npm yet");
	});

	test("Copy brief writes the brief to the clipboard", async ({ page, context }) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/inspiration/pulse-beam");
		await page.waitForLoadState("networkidle");
		await page.getByRole("button", { name: "Copy brief" }).click();
		await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
		const text = await page.evaluate(() => navigator.clipboard.readText());
		expect(text).toContain("Composer — pulse beam");
		expect(text).toContain("/inspiration/pulse-beam");
	});
});

test.describe("search field sync", () => {
	test("the home search fills the gallery field, and the header link clears it", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		const home = page.getByRole("searchbox", { name: "Search inspiration" }).first();
		await home.fill("beam");
		await home.press("Enter");
		await expect(page).toHaveURL(/\/inspiration\?q=beam$/);
		await page.locator("main[data-ready]").waitFor();
		const field = page.getByRole("searchbox", { name: "Search inspiration" });
		await expect(field).toHaveValue("beam");
		await page
			.getByRole("navigation", { name: "Main" })
			.getByRole("link", { name: "Inspiration" })
			.click();
		await expect(page).toHaveURL(/\/inspiration$/);
		await expect(field).toHaveValue("");
	});

	test("a facet toggle while a search is pending makes one history entry", async ({ page }) => {
		await open(page, "/inspiration");
		const before = await page.evaluate(() => history.length);
		const field = page.getByRole("searchbox", { name: "Search inspiration" });
		await field.fill("beam");
		await page.locator('[data-facet-value="glow"]').click();
		await expect(page).toHaveURL(/\?q=beam&style=glow$/);
		await page.waitForTimeout(300); // past the debounce: nothing else may land
		expect(await page.evaluate(() => history.length)).toBe(before + 1);
		await expect(page).toHaveURL(/\?q=beam&style=glow$/);
	});
});

test.describe("detail → related", () => {
	test("a Related card shows its own demo, not the previous one", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto("/inspiration/pulse-beam");
		const stage = page.locator(".frame [data-stage]");
		await expect(stage).toHaveAttribute("data-stage", "pulse-beam");
		await expect(stage.locator("[data-demo-mounted]")).toHaveAttribute(
			"data-demo-mounted",
			"pulse-beam"
		);
		const next = page.locator("section.related article.ic").first();
		const slug = (await next.getAttribute("data-slug"))!;
		await next.locator("h3 a").click();
		await expect(page).toHaveURL(new RegExp(`/inspiration/${slug}$`));
		await expect(stage).toHaveAttribute("data-stage", slug);
		await expect(stage.locator("[data-demo-mounted]")).toHaveCount(1);
		const mounted = await stage.locator("[data-demo-mounted]").getAttribute("data-demo-mounted");
		expect(mounted).not.toBe("pulse-beam");
		await expect(page.locator(".frame [data-demo-mounted]")).toHaveCount(1);
	});
});

test("/finds redirects permanently to /inspiration", async ({ request }) => {
	const response = await request.get("/finds", { maxRedirects: 0 });
	expect(response.status()).toBe(301);
	expect(response.headers()["location"]).toMatch(/\/inspiration$/);
});
