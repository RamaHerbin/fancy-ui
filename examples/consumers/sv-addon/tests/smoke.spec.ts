import { expect, test } from "@playwright/test";
import {
	collectErrors,
	expectBorderBeamRunning,
	expectPrimaryBackground,
} from "../../smoke-helpers";

// The demo route the add-on wrote, in an app made by `sv create` + `sv add`, with
// fancy-ui-svelte installed from the packed tarball. Nothing in the app was written by hand.
test("demo route: server-rendered, hydrates, Tailwind tokens and the effect run", async ({
	page,
}) => {
	const errors = collectErrors(page);

	const response = await page.goto("/demo/fancy-ui");
	expect(response?.status()).toBe(200);
	// Server-rendered: the components' markup is in the HTML before any script runs.
	const html = await response!.text();
	expect(html).toContain("border-beam");
	expect(html).toContain("clicks: 0");

	// Interactive once hydrated: retry the click until the handler has been attached.
	const clicks = page.getByTestId("fancy-clicks");
	await expect(async () => {
		await page.getByRole("button", { name: "Click me" }).click();
		await expect(clicks).not.toHaveText("clicks: 0", { timeout: 500 });
	}).toPass({ timeout: 15_000 });

	// bg-primary and the tokens come from the one CSS line the add-on wrote.
	await expectPrimaryBackground(page, 'button:has-text("Reset")');
	await expectBorderBeamRunning(page);

	// The sv demo post-it lists the route (defineDemoPage wiring in the root layout).
	await expect(page.getByRole("link", { name: "fancy-ui", exact: true })).toBeVisible();

	expect(errors).toEqual([]);
});
