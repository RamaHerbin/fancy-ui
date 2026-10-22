import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
	collectErrors,
	expectBorderBeamRunning,
	expectGpuCanvas,
	expectKeyboardDialog,
	expectPrimaryBackground,
	waitForHydration,
} from "../../smoke-helpers";
import { expectDarkViaClass, expectDialogSlots, expectVueEvents } from "../../vue-smoke";

// fancy-ui-nuxt and fancy-ui-vue installed from their packed tarballs, in a Nuxt
// (server-rendered) app built outside the repo. Same app and assertions as
// ../../nuxt, except that nothing is imported by hand: the module registers the
// components as Fancy<Name> and adds fancy-ui-vue/styles.css.
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

// Vue's production runtime always logs "Hydration completed but contains
// mismatches." as an error; the app's __VUE_PROD_HYDRATION_MISMATCH_DETAILS__
// define (nuxt.config.ts) only adds the per-node detail to the failure output.
// Every console message of any severity is kept, so a mismatch reported as a
// warning cannot slip past a check that only reads errors. Negative control: a
// `{{ Date.now() }}` text in app.vue turns this test red, with and without the
// define.
test("no hydration mismatch: the server renders the library's markup and the console stays quiet", async ({
	page,
	request,
}) => {
	const messages: string[] = [];
	page.on("console", (m) => messages.push(`${m.type()}: ${m.text()}`));
	page.on("pageerror", (e) => messages.push(`pageerror: ${String(e)}`));

	// The server really rendered the components (no client-only shell).
	const html = await (await request.get("/")).text();
	for (const text of ["Plain button", "Open dialog", "Click me", "Your name", "Shimmer"]) {
		expect(html, `server HTML contains "${text}"`).toContain(text);
	}
	// An unregistered <FancyX> would render as an unknown <fancyx> element.
	expect(html, "every Fancy* tag resolved to a component").not.toMatch(/<fancy[a-z-]*[\s>]/i);

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

// The README setup is the whole setup: main.css carries only the two Tailwind
// lines (styles.css comes from the module; the BorderBeam check above proves it
// arrived), and the page imports nothing from the packages by hand.
test("the app's CSS is the two README imports and app.vue imports nothing", () => {
	const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
	const css = read("../app/assets/css/main.css");
	const imports = [...css.matchAll(/@import\s+["']([^"']+)["']/g)].map((m) => m[1]);
	expect(imports).toEqual(["tailwindcss", "fancy-ui-vue/tailwind.css"]);
	expect(read("../app/app.vue")).not.toMatch(/\bimport\b/);
});
