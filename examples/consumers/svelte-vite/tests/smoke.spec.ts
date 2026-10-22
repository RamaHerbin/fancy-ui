import { expect, test } from "@playwright/test";
import {
	collectErrors,
	expectBorderBeamRunning,
	expectGpuCanvas,
	expectKeyboardDialog,
	expectPrimaryBackground,
} from "../../smoke-helpers";
import {
	expectButtonOnclick,
	expectDarkAncestorTheme,
	expectDialogOnOpenChange,
	expectInstallSnippets,
} from "../../svelte-helpers";

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

// Cameleon is a success path: FancyProvider no longer imports a SvelteKit-only
// module, so the subpath builds and mounts in a plain Vite app.
test("Cameleon FancyProvider mounts outside SvelteKit", async ({ page }) => {
	const errors = collectErrors(page);
	await page.goto("/");
	const section = page.getByTestId("cameleon");
	await expect(section.locator('[data-skin="brutal"]')).toBeVisible();
	await expect(section.getByRole("button", { name: "Skinned button" })).toBeVisible();
	expect(errors).toEqual([]);
});

test("a .dark ancestor flips the Button background", async ({ page }) => {
	const errors = collectErrors(page);
	await page.emulateMedia({ colorScheme: "light" });
	await page.goto("/");
	await expectDarkAncestorTheme(page, {
		toggle: '[data-testid="theme-toggle"]',
		root: '[data-testid="theme-root"]',
		button: '[data-testid="button"]',
	});
	expect(errors).toEqual([]);
});

test("Button onclick and Dialog onOpenChange reach the consumer's handlers", async ({ page }) => {
	const errors = collectErrors(page);
	await page.goto("/");
	await expectButtonOnclick(page, '[data-testid="button"]', '[data-testid="button-clicks"]');
	await expectDialogOnOpenChange(
		page,
		'[data-testid="open-dialog"]',
		'[data-testid="dialog-events"]'
	);
	expect(errors).toEqual([]);
});

test("the install page's snippets compile, render and animate", async ({ page }) => {
	const errors = collectErrors(page);
	await page.goto("/");
	await expectInstallSnippets(page);
	expect(errors).toEqual([]);
});
