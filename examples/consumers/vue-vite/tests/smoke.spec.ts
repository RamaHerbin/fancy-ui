import { expect, test } from "@playwright/test";

test("loads clean, hydrates, styles and dialog work from the packed tarball", async ({ page }) => {
	const errors: string[] = [];
	page.on("console", (m) => {
		if (m.type() === "error") errors.push(m.text());
	});
	page.on("pageerror", (e) => errors.push(String(e)));

	await page.goto("/");
	await expect(page.getByRole("heading", { name: "fancy-ui-vue consumer" })).toBeVisible();

	// Interactive: the consumer's handler ran.
	await page.getByTestId("rainbow").click();
	await expect(page.getByTestId("clicks")).toHaveText("Rainbow clicked 1 times");

	// bg-primary exists: the Button's background is the --primary token.
	const { bg, primary } = await page.getByRole("button", { name: "Primary button" }).evaluate((el) => {
		const probe = document.createElement("div");
		probe.style.backgroundColor = "var(--primary)";
		document.body.appendChild(probe);
		const primary = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return { bg: getComputedStyle(el).backgroundColor, primary };
	});
	expect(primary).not.toBe("rgba(0, 0, 0, 0)");
	expect(bg).toBe(primary);

	// A GPU effect mounted AND bound a GPU context. The canvas is always in the
	// template, so counting it proves nothing; instead ask for a 2d context: it
	// returns null only when another context type (webgl/webgpu) already owns it.
	const canvas = page.getByTestId("fluid").locator("canvas");
	await expect(canvas).toHaveCount(1);
	await expect.poll(() => canvas.evaluate((c) => (c as HTMLCanvasElement).getContext("2d") === null)).toBe(true);

	// Dialog: keyboard open, Escape close.
	const trigger = page.getByRole("button", { name: "Open dialog" });
	await trigger.focus();
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();

	expect(errors).toEqual([]);
});
