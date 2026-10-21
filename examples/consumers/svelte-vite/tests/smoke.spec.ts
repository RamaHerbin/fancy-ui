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

// scripts/consumers/svelte-vite.sh first builds the app WITH the Cameleon
// section (CONSUMER_CAMELEON=1). Today that build fails: FancyProvider imports
// `$app/environment`, which only exists inside SvelteKit. The script asserts
// that this is the reason (any other build failure fails the run), rebuilds
// without the section, and reports CONSUMER_CAMELEON_BUILD=needs-sveltekit.
// Once branch fix/cameleon-without-sveltekit lands, the Cameleon build
// succeeds, the script serves it, and this test runs for real.
test("Cameleon FancyProvider mounts outside SvelteKit", async ({ page }) => {
	const build = process.env.CONSUMER_CAMELEON_BUILD;
	test.fixme(
		build !== "ok",
		"fancy-ui-svelte/cameleon FancyProvider imports $app/environment and cannot build outside SvelteKit; fixed on branch fix/cameleon-without-sveltekit"
	);

	const errors = collectErrors(page);
	await page.goto("/");
	const section = page.getByTestId("cameleon");
	await expect(section.locator('[data-skin="brutal"]')).toBeVisible();
	await expect(section.getByRole("button", { name: "Skinned button" })).toBeVisible();
	expect(errors).toEqual([]);
});
