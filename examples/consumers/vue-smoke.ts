import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

/**
 * Vue-specific assertions shared by the vue-vite and nuxt smokes. Both apps
 * render the same markup and the same data-testid hooks; see smoke-helpers.ts
 * for the framework-neutral ones.
 */

/**
 * The consumer's own listeners receive what the library emits: `@click` on a
 * Button, `@update:value` on Input, `v-model:value` on Select, `v-model:checked`
 * on Switch. (The library names its models after the prop: value, checked,
 * open, never modelValue.)
 */
export async function expectVueEvents(page: Page) {
	await expect(page.getByTestId("button-clicks")).toHaveText("button clicks: 0");
	await page.getByTestId("button").click();
	await expect(page.getByTestId("button-clicks")).toHaveText("button clicks: 1");

	const input = page.getByLabel("Name");
	await input.fill("Ada");
	await expect(page.getByTestId("name-out")).toContainText("name: Ada");
	await expect(page.getByTestId("name-out")).not.toContainText("(0 updates)");

	await page.getByRole("combobox").click();
	await page
		.getByRole("option", { name: "React" })
		.or(page.getByRole("option", { name: "Pear" }))
		.click();
	await expect(page.getByTestId("framework-out")).toHaveText(/framework: (react|pear)/);

	await page.getByRole("switch", { name: "Notifications" }).click();
	await expect(page.getByTestId("notify-out")).toHaveText("notifications: on");
}

/**
 * Named slots: `#trigger` renders the opener, the default slot and `#footer`
 * render inside the dialog, and a `@click` inside the footer slot reaches the
 * consumer, who closes the dialog; `@update:open` saw the opening.
 */
export async function expectDialogSlots(page: Page) {
	await expect(page.getByTestId("open-out")).toHaveText("open: false (0 updates)");
	await page.getByRole("button", { name: "Open dialog" }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await expect(dialog.getByTestId("dialog-body")).toHaveText("Dialog body");
	await expect(page.getByTestId("open-out")).toHaveText("open: true (1 updates)");
	await dialog.getByTestId("dialog-done").click();
	await expect(dialog).toBeHidden();
	// The consumer closed it itself (parent state), so no second update is emitted.
	await expect(page.getByTestId("open-out")).toHaveText("open: false (1 updates)");
}

/**
 * Dark mode is `.dark` on <html>: the token flips, the Button follows it, and
 * the class wins over an OS preference for light.
 */
export async function expectDarkViaClass(page: Page) {
	await page.emulateMedia({ colorScheme: "light" });
	const read = () =>
		page.evaluate(() => {
			const probe = document.createElement("div");
			probe.style.backgroundColor = "var(--primary)";
			document.body.appendChild(probe);
			const token = getComputedStyle(probe).backgroundColor;
			probe.remove();
			const button = document.querySelector('[data-testid="button"]')!;
			return {
				token,
				bg: getComputedStyle(button).backgroundColor,
				scheme: getComputedStyle(document.documentElement).colorScheme,
			};
		});
	const light = await read();
	await page.evaluate(() => document.documentElement.classList.add("dark"));
	// Buttons transition their colours: wait for the computed value to settle.
	await expect
		.poll(async () => {
			const s = await read();
			return s.bg === s.token;
		}, "the Button follows the dark token")
		.toBe(true);
	const dark = await read();
	await page.evaluate(() => document.documentElement.classList.remove("dark"));

	expect(dark.scheme).toBe("dark");
	expect(dark.token).not.toBe(light.token);
	expect(light.bg).toBe(light.token);
}

/**
 * The app's stylesheet imports exactly the two documented package entries, and
 * nothing else from the package: this is the whole CSS setup a consumer needs.
 */
export function expectDocumentedStylesOnly(appCssRelativeToSpec: string, specUrl: string) {
	const css = readFileSync(join(dirname(fileURLToPath(specUrl)), appCssRelativeToSpec), "utf8");
	const imports = [...css.matchAll(/@import\s+["']([^"']+)["']/g)].map((m) => m[1]);
	expect(imports).toEqual(["tailwindcss", "fancy-ui-vue/tailwind.css", "fancy-ui-vue/styles.css"]);
}
