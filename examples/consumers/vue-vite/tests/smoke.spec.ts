import { expect, test } from "@playwright/test";
import {
	collectErrors,
	expectBorderBeamRunning,
	expectGpuCanvas,
	expectKeyboardDialog,
	expectPrimaryBackground,
} from "../../smoke-helpers";
import {
	expectDarkViaClass,
	expectDialogSlots,
	expectDocumentedStylesOnly,
	expectVueEvents,
} from "../../vue-smoke";

// fancy-ui-vue installed from the packed tarball, in a Vue + Vite app built outside the repo.
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

test("events reach the consumer's handlers and the dialog's named slots render", async ({
	page,
}) => {
	const errors = collectErrors(page);
	await page.goto("/");
	await expectVueEvents(page);
	await expectDialogSlots(page);
	expect(errors).toEqual([]);
});

test("dark mode is the .dark class on <html>", async ({ page }) => {
	await page.goto("/");
	await expectDarkViaClass(page);
});

test("the app's CSS is the two documented imports and nothing else from the package", () => {
	expectDocumentedStylesOnly("../src/style.css", import.meta.url);
});
