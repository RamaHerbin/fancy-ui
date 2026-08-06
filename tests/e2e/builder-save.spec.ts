import { test, expect } from "@playwright/test";

const BUILDER_URL = "/builder/test";
// process.platform matches the test runner OS — fine for local + CI where
// runner and browser always share the same platform (no remote browsers).
const modifier = process.platform === "darwin" ? "Meta" : "Control";

test.describe("Builder — Save", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BUILDER_URL);
		await page.locator('[role="treeitem"]').first().waitFor({ timeout: 15000 });
		// networkidle ensures Svelte hydration is complete before interacting
		await page.waitForLoadState("networkidle");
	});

	test("Cmd+S triggers save and the button cycles through Saving → Saved → Save", async ({
		page,
	}) => {
		// The button starts at "Save"
		const saveBtn = page.getByRole("button", { name: "Save" });
		await expect(saveBtn).toBeVisible();

		// Listen for the PUT request
		const savePromise = page.waitForResponse(
			(res) => res.url().includes("/api/builder/pages/test") && res.request().method() === "PUT"
		);

		await page.keyboard.press(`${modifier}+s`);

		// Wait for the API response
		const response = await savePromise;
		expect(response.ok()).toBe(true);

		// Should transition to "Saved" (green button)
		await expect(page.getByRole("button", { name: "Saved" })).toBeVisible({ timeout: 5000 });

		// After ~2s the button resets to "Save".
		// Using toBeVisible with a timeout rather than a fixed waitForTimeout —
		// Playwright auto-retries until the condition is met, which is more
		// reliable than guessing a sleep duration.
		await expect(page.getByRole("button", { name: "Save" })).toBeVisible({ timeout: 5000 });
	});

	test("Clicking the Save button triggers save", async ({ page }) => {
		const savePromise = page.waitForResponse(
			(res) => res.url().includes("/api/builder/pages/test") && res.request().method() === "PUT"
		);

		await page.getByRole("button", { name: "Save" }).click();

		const response = await savePromise;
		expect(response.ok()).toBe(true);

		await expect(page.getByRole("button", { name: "Saved" })).toBeVisible({ timeout: 5000 });
	});
});
