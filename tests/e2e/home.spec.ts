import { expect, test, type Page } from "@playwright/test";

/** The save buttons only carry `aria-pressed` after mount: a hydration signal. */
async function hydrated(page: Page) {
	await expect(page.locator("[data-preview-card] .save[aria-pressed]").first()).toBeAttached();
}

test.describe("Home", () => {
	test("the first row of posters is fully visible at 1440×900", async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto("/");
		const posters = page.locator("[data-preview-card] img");
		await expect(posters).toHaveCount(6);
		for (let i = 0; i < 3; i++) {
			const box = await posters.nth(i).boundingBox();
			expect(box).not.toBeNull();
			expect(box!.y + box!.height).toBeLessThanOrEqual(900);
		}
	});

	test("at 390×844 nothing overflows and the first poster starts on screen", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await hydrated(page);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
		const box = await page.locator("[data-preview-card] img").first().boundingBox();
		expect(box!.y).toBeLessThan(844);
	});

	test("the hero search submits to the gallery", async ({ page }) => {
		await page.goto("/");
		await hydrated(page);
		const search = page.getByRole("main").getByRole("search");
		await search.getByRole("searchbox").fill("magnetic button");
		await search.getByRole("searchbox").press("Enter");
		await expect(page).toHaveURL(/\/inspiration\?q=magnetic(%20|\+)button$/);
	});

	test("the framework choice persists and drives the install line", async ({ page }) => {
		await page.goto("/");
		await hydrated(page);
		const install = page.locator("[data-install]");
		const line = install.locator("[data-install-line]");
		await expect(line).toContainText("pnpm add fancy-ui-svelte");

		await install.getByRole("radiogroup").getByRole("radio", { name: "React" }).click();
		await expect(line).toContainText("pnpm add fancy-ui-react");
		expect(await page.evaluate(() => localStorage.getItem("fancy-ui-framework"))).toBe("react");

		// The hero switch shares the store.
		await expect(
			page
				.getByRole("main")
				.getByRole("radiogroup", { name: "Framework", exact: true })
				.getByRole("radio", {
					name: "React",
				})
		).toHaveAttribute("aria-checked", "true");

		await install.getByRole("radiogroup").getByRole("radio", { name: "Vue" }).click();
		await expect(line).toContainText("coming to npm");
		await expect(line.getByRole("link", { name: /source on GitHub/ })).toBeVisible();

		await page.reload();
		await hydrated(page);
		await expect(line).toContainText("coming to npm");
	});

	test("the motion toggle pauses the page", async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto("/");
		await hydrated(page);
		await page.getByRole("banner").getByRole("button", { name: "Pause motion" }).click();
		await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
	});
});

test.describe("Home — reduced motion", () => {
	test("no canvas, and no running decorative animation", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		await hydrated(page);
		// Bring every lazy section in, then come back.
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForTimeout(600);
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.waitForTimeout(400);

		await expect(page.locator("canvas")).toHaveCount(0);
		const running = await page.evaluate(
			() =>
				[...document.querySelectorAll("[data-decorative]")]
					.flatMap((el) => el.getAnimations({ subtree: true }))
					// Finite hover/fade transitions are not loops; only animations count.
					.filter((animation) => !(animation instanceof CSSTransition))
					.filter((animation) => animation.playState === "running").length
		);
		expect(running).toBe(0);
	});
});
