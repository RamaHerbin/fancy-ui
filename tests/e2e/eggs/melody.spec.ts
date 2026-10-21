import { expect, test } from "@playwright/test";
import { hydratedDocs, readEggs, seed } from "./helpers";

test.describe("Melody egg", () => {
	// The header sound switch is hidden below the sm breakpoint.
	test.use({ viewport: { width: 1280, height: 800 } });
	test.describe.configure({ timeout: 90_000 });

	test("brushing the sound switch seven times with sound on plays the phrase", async ({ page }) => {
		await seed(
			page,
			"fancy-ui-sound",
			JSON.stringify({ v: 1, enabled: true, volume: 0.5, theme: "fancy" })
		);
		await page.goto("/docs/components/button");
		await hydratedDocs(page);

		const toggle = page.locator("[data-sound-toggle]:visible").first();
		await expect(toggle).toBeVisible();
		const box = await toggle.boundingBox();
		if (!box) throw new Error("sound switch has no box");
		// A point well below the switch, outside any toggle, to leave it between hovers.
		const away = { x: box.x + box.width / 2, y: box.y + box.height + 120 };

		expect(await readEggs(page)).not.toContain("melody");
		for (let i = 0; i < 7; i++) {
			await toggle.hover();
			await page.mouse.move(away.x, away.y);
		}
		await expect.poll(() => readEggs(page), { timeout: 3000 }).toContain("melody");
	});

	test("with sound off the brush does not count", async ({ page }) => {
		await page.goto("/docs/components/button");
		await hydratedDocs(page);
		const toggle = page.locator("[data-sound-toggle]:visible").first();
		const box = await toggle.boundingBox();
		if (!box) throw new Error("sound switch has no box");
		for (let i = 0; i < 7; i++) {
			await toggle.hover();
			await page.mouse.move(box.x + box.width / 2, box.y + box.height + 120);
		}
		// Give a load() + run() time to (wrongly) record a find.
		await page.waitForTimeout(800);
		expect(await readEggs(page)).not.toContain("melody");
	});
});
