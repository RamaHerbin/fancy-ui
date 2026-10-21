import { expect, test } from "@playwright/test";
import {
	collectErrors,
	expectBorderBeamRunning,
	expectGpuCanvas,
	expectKeyboardDialog,
	expectPrimaryBackground,
	waitForHydration,
} from "../../smoke-helpers";
import {
	expectDarkViaClass,
	expectDialogSlots,
	expectDocumentedStylesOnly,
	expectVueEvents,
} from "../../vue-smoke";

// fancy-ui-vue installed from the packed tarball, in a Nuxt (server-rendered) app built outside the repo.
test("loads clean, hydrates, styles resolve, effects run, dialog is keyboard-operable", async ({
	page,
}) => {
	const errors = collectErrors(page);

	await page.goto("/");
	// Server-rendered: wait until the framework has hydrated before clicking.
	await waitForHydration(page);

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

// The production build strips Vue's hydration diagnostics unless the app's
// build defines __VUE_PROD_HYDRATION_MISMATCH_DETAILS__ (nuxt.config.ts does).
// Every console message of any severity is kept, so a mismatch reported as a
// warning cannot slip past a check that only reads errors.
test("no hydration mismatch: the server renders the library's markup and the console stays quiet", async ({
	page,
	request,
}) => {
	const messages: string[] = [];
	page.on("console", (m) => messages.push(`${m.type()}: ${m.text()}`));
	page.on("pageerror", (e) => messages.push(`pageerror: ${String(e)}`));

	// The server really rendered the components (no client-only shell).
	const html = await (await request.get("/")).text();
	for (const text of ["Plain button", "Open dialog", "Click me", "Your name"]) {
		expect(html, `server HTML contains "${text}"`).toContain(text);
	}

	await page.goto("/");
	await waitForHydration(page);
	// Let any deferred hydration work and post-mount effects run.
	await page.waitForTimeout(500);

	const noisy = messages.filter((m) => /hydrat|mismatch/i.test(m));
	expect(noisy, "hydration diagnostics").toEqual([]);
	const problems = messages.filter((m) => /^(error|warning|pageerror)/.test(m));
	expect(problems).toEqual([]);
});

test("events reach the consumer's handlers and the dialog's named slots render", async ({
	page,
}) => {
	const errors = collectErrors(page);
	await page.goto("/");
	await waitForHydration(page);
	await expectVueEvents(page);
	await expectDialogSlots(page);
	expect(errors).toEqual([]);
});

test("dark mode is the .dark class on <html>", async ({ page }) => {
	await page.goto("/");
	await waitForHydration(page);
	await expectDarkViaClass(page);
});

test("the app's CSS is the two documented imports and nothing else from the package", () => {
	expectDocumentedStylesOnly("../app/assets/css/main.css", import.meta.url);
});
