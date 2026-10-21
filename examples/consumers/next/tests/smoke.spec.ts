import { expect, test } from "@playwright/test";

test.describe("fancy-ui-react from the packed tarball", () => {
	test("loads without console errors and hydrates", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (message) => {
			if (message.type() === "error") errors.push(message.text());
		});
		page.on("pageerror", (error) => errors.push(error.message));

		await page.goto("/");
		await expect(page.getByTestId("clicks")).toHaveText("clicks: 0");

		await page.getByTestId("rainbow").click();
		await expect(page.getByTestId("clicks")).toHaveText("clicks: 1");

		await page.waitForTimeout(500);
		expect(errors).toEqual([]);
	});

	test("bg-primary exists: a Button paints the --primary token", async ({ page }) => {
		await page.goto("/");
		const { actual, expected } = await page.evaluate(() => {
			const button = document.querySelector<HTMLElement>('[data-testid="button"]')!;
			const probe = document.createElement("div");
			probe.style.backgroundColor = "var(--primary)";
			document.body.appendChild(probe);
			const expected = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return { actual: getComputedStyle(button).backgroundColor, expected };
		});
		expect(expected).not.toBe("rgba(0, 0, 0, 0)");
		expect(actual).not.toBe("rgba(0, 0, 0, 0)");
		expect(actual).toBe(expected);
	});

	test("dialog opens and closes with the keyboard", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByTestId("clicks")).toBeVisible();
		await page.getByRole("button", { name: "Open dialog" }).focus();
		await page.keyboard.press("Enter");
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
	});

	test("the light and GPU effects mount", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByTestId("beam-card").locator("div, span").first()).toBeAttached();
		await expect(page.getByTestId("fluid").locator("canvas")).toBeAttached();
	});
});
