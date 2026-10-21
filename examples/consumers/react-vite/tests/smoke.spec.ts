import { expect, test } from "@playwright/test";

test("page loads clean, hydrates, styles resolve, dialog is keyboard-operable", async ({ page }) => {
	const problems: string[] = [];
	page.on("console", (m) => {
		if (m.type() === "error") problems.push(m.text());
	});
	page.on("pageerror", (e) => problems.push(String(e)));

	await page.goto("/");

	// Hydration: the consumer's own handler runs through the library button.
	await expect(page.getByTestId("clicks")).toHaveText("clicks: 0");
	await page.getByTestId("rainbow").click();
	await expect(page.getByTestId("clicks")).toHaveText("clicks: 1");

	// bg-primary exists: the computed colour equals the --primary token.
	const { bg, token } = await page.getByTestId("button").evaluate((el) => {
		const probe = document.createElement("div");
		document.body.appendChild(probe);
		probe.style.backgroundColor = "var(--primary)";
		const token = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return { bg: getComputedStyle(el).backgroundColor, token };
	});
	expect(bg).not.toBe("rgba(0, 0, 0, 0)");
	expect(bg).not.toBe("transparent");
	expect(bg).toBe(token);

	// Effects mounted.
	await expect(page.getByTestId("fluid-card").locator("canvas")).toHaveCount(1);
	expect(await page.getByTestId("beam-card").locator("> *").count()).toBeGreaterThan(1);

	// Dialog: open by click, Escape closes.
	await page.getByTestId("open-dialog").click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();

	// Keyboard open: focus the trigger, Enter opens, Escape closes again.
	await page.getByTestId("open-dialog").focus();
	await page.keyboard.press("Enter");
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();

	expect(problems).toEqual([]);
});
