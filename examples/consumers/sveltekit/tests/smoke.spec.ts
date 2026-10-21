import { expect, test } from "@playwright/test";

test("loads and hydrates without console errors", async ({ page }) => {
	const errors: string[] = [];
	page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
	page.on("pageerror", (e) => errors.push(String(e)));

	await page.goto("/");
	await page.waitForLoadState("networkidle");

	// Hydration: the consumer's own handler runs on a library component.
	await page.getByTestId("rainbow").click();
	await expect(page.getByTestId("clicks")).toHaveText("clicks: 1");

	expect(errors).toEqual([]);
});

test("bg-primary exists: Button background equals the --primary token", async ({ page }) => {
	await page.goto("/");
	const { bg, token } = await page.evaluate(() => {
		const btn = document.querySelector<HTMLElement>('[data-testid="button"] button')!;
		const probe = document.createElement("div");
		probe.style.backgroundColor = "var(--primary)";
		document.body.append(probe);
		const token = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return { bg: getComputedStyle(btn).backgroundColor, token };
	});
	expect(bg).not.toBe("rgba(0, 0, 0, 0)");
	expect(bg).toBe(token);
});

test("Dialog opens and closes from the keyboard", async ({ page }) => {
	await page.goto("/");
	await page.waitForLoadState("networkidle");
	await page.locator('[data-testid="open-dialog"] button').focus();
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
});
