import { test, expect } from "@playwright/test";

test("loads, hydrates, styles and opens a dialog from the packed tarball", async ({ page }) => {
	const errors: string[] = [];
	page.on("console", (m) => {
		if (m.type() === "error") errors.push(m.text());
	});
	page.on("pageerror", (e) => errors.push(String(e)));

	await page.goto("/");
	await expect(page.getByTestId("clicks")).toHaveText("clicks: 0");

	// Hydration: the consumer's handler runs on the library's button.
	await page.getByTestId("rainbow").click();
	await expect(page.getByTestId("clicks")).toHaveText("clicks: 1");

	// bg-primary exists in the generated CSS and resolves to the token.
	const { bg, token } = await page.getByRole("button", { name: "Plain button" }).evaluate((el) => {
		const probe = document.createElement("div");
		probe.style.backgroundColor = getComputedStyle(document.documentElement)
			.getPropertyValue("--primary")
			.trim();
		document.body.appendChild(probe);
		const token = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return { bg: getComputedStyle(el).backgroundColor, token };
	});
	expect(token).not.toBe("rgba(0, 0, 0, 0)");
	expect(bg).not.toBe("rgba(0, 0, 0, 0)");
	expect(bg).toBe(token);

	// Dialog: open and close from the keyboard.
	await page.getByRole("button", { name: "Open dialog" }).focus();
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();

	expect(errors).toEqual([]);
});
