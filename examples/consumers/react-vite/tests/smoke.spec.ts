import { expect, test } from "@playwright/test";
import {
	collectErrors,
	expectBorderBeamRunning,
	expectGpuCanvas,
	expectKeyboardDialog,
	expectPrimaryBackground,
} from "../../smoke-helpers";

// fancy-ui-react installed from the packed tarball, in a React + Vite app built outside the repo.
test("loads clean, mounts, styles resolve, effects run, dialog is keyboard-operable", async ({
	page,
}) => {
	const errors = collectErrors(page);

	await page.goto("/");

	// Interactive: the consumer's own handler runs through the library button.
	await expect(page.getByTestId("clicks")).toHaveText("clicks: 0");
	await page.getByTestId("rainbow").click();
	await expect(page.getByTestId("clicks")).toHaveText("clicks: 1");

	// bg-primary is generated in the consumer's CSS from the packed output.
	await expectPrimaryBackground(page, '[data-testid="button"]');

	// The light effect's markup and stylesheet both arrived, and it animates.
	await expectBorderBeamRunning(page);

	// The GPU effect bound a WebGL/WebGPU context.
	await expectGpuCanvas(page, "fluid");

	await expectKeyboardDialog(page, "Open dialog");

	expect(errors).toEqual([]);
});

test("onOpenChange reaches the consumer's handler", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByTestId("dialog-state")).toHaveText("dialog: closed");
	await page.getByTestId("open-dialog").click();
	await expect(page.getByTestId("dialog-state")).toHaveText("dialog: open");
	await page.keyboard.press("Escape");
	await expect(page.getByTestId("dialog-state")).toHaveText("dialog: closed");
});

test("the .dark class re-themes the tokens and the button", async ({ page }) => {
	await page.goto("/");
	const read = () =>
		page.getByTestId("button").evaluate((el) => {
			const probe = document.createElement("div");
			probe.style.backgroundColor = "var(--primary)";
			document.body.appendChild(probe);
			const background = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return { background, button: getComputedStyle(el).backgroundColor };
		});
	const light = await read();
	await page.evaluate(() => document.documentElement.classList.add("dark"));
	// Buttons transition their colours: wait for the computed value to settle.
	await expect
		.poll(async () => {
			const s = await read();
			return s.button === s.background;
		}, "the Button follows the dark --primary token")
		.toBe(true);
	const dark = await read();
	expect(light.background).not.toBe("rgba(0, 0, 0, 0)");
	expect(light.button).toBe(light.background);
	expect(dark.background).not.toBe(light.background);
});
