import { expect, test } from "@playwright/test";
import { hydratedDocs, readEggs, seed } from "./helpers";

test.describe("Retro desktop Start menu egg", () => {
	// A cold dev server compiles the docs chrome and the retro kit on first visit.
	test.describe.configure({ timeout: 90_000 });

	test("About shows the window; Shut down leaves the retro skin", async ({ page }) => {
		await seed(page, "fancy-ui-skin", "retro-os");
		await page.goto("/docs/components/button");
		await hydratedDocs(page);

		const taskbar = page.locator(".retro-taskbar");
		const start = taskbar.getByRole("button", { name: /start/i });
		await start.click();
		const menu = page.getByRole("menu");
		await expect(menu).toBeVisible();
		await expect(start).toHaveAttribute("aria-expanded", "true");

		await menu.getByRole("menuitem", { name: /about fancyui/i }).click();
		await expect(page.getByText("ABOUT.EXE")).toBeVisible();
		expect(await readEggs(page)).toContain("retro");
		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByText("ABOUT.EXE")).toHaveCount(0);
		await expect(start).toHaveAttribute("aria-expanded", "false");

		// Escape closes and hands focus back to Start.
		await start.click();
		await expect(menu).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.getByRole("menu")).toHaveCount(0);
		await expect(start).toBeFocused();

		await start.click();
		await page.getByRole("menuitem", { name: /shut down/i }).click();
		await expect(page.locator('.docs-skin[data-skin="retro-os"]')).toHaveCount(0, {
			timeout: 5000,
		});
		await expect(page.locator(".retro-taskbar")).toHaveCount(0);
		await expect(page.locator('[data-egg-overlay="retro"]')).toHaveCount(0, { timeout: 5000 });
		expect(await page.evaluate(() => localStorage.getItem("fancy-ui-skin"))).toBe("standard");
		expect(await readEggs(page)).toContain("retro");
	});

	test("tabbing out of the menu closes it", async ({ page }) => {
		await seed(page, "fancy-ui-skin", "retro-os");
		await page.goto("/docs/components/button");
		await hydratedDocs(page);
		const start = page.locator(".retro-taskbar").getByRole("button", { name: /start/i });
		await start.click();
		await expect(page.getByRole("menu")).toBeVisible();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Tab");
		await expect(page.getByRole("menu")).toHaveCount(0);
		await expect(start).toHaveAttribute("aria-expanded", "false");
	});

	test("an outside click closes the menu", async ({ page }) => {
		await seed(page, "fancy-ui-skin", "retro-os");
		await page.goto("/docs/components/button");
		await hydratedDocs(page);
		await page.locator(".retro-taskbar").getByRole("button", { name: /start/i }).click();
		await expect(page.getByRole("menu")).toBeVisible();
		await page
			.locator("main, #main")
			.first()
			.click({ position: { x: 5, y: 5 } });
		await expect(page.getByRole("menu")).toHaveCount(0);
	});
});
