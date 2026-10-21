import { expect, test } from "@playwright/test";
import {
	collectErrors,
	expectBorderBeamRunning,
	expectGpuCanvas,
	expectKeyboardDialog,
	expectPrimaryBackground,
} from "../../smoke-helpers";

// fancy-ui-svelte installed from the packed tarball, in a plain Svelte + Vite
// app (no SvelteKit) built outside the repo.
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

// scripts/consumers/svelte-vite.sh builds the app WITH the Cameleon section
// (CONSUMER_CAMELEON=1) and fails the run if that build fails: FancyProvider
// must keep building outside SvelteKit. A build without the section (the
// stand-in from CameleonOff.svelte) fails here instead of being skipped.
test("Cameleon FancyProvider mounts outside SvelteKit", async ({ page }) => {
	const errors = collectErrors(page);
	await page.goto("/");
	const section = page.getByTestId("cameleon");
	await expect(section.locator('[data-skin="brutal"]')).toBeVisible();
	await expect(section.getByRole("button", { name: "Skinned button" })).toBeVisible();
	expect(errors).toEqual([]);
});
