import { expect, test, type Page } from "@playwright/test";
import { collectErrors } from "../../examples/consumers/smoke-helpers";

/**
 * Mounts each docs example in a real browser, in a consumer app that loads the
 * package's own stylesheet, and drives it the way a reader would. Any console
 * error, framework warning or uncaught exception fails the example. Overlays
 * are opened and must become visible, so a popover that never shows fails.
 */
const slugs = (process.env.DOCS_EXAMPLES_SLUGS ?? "").split(",").filter(Boolean);

type Scenario = (page: Page) => Promise<void>;

const typeInto = async (page: Page) => {
	const box = page.getByRole("textbox").first();
	await box.fill("hello");
	await expect(box).toHaveValue("hello");
};

const flipFirst = (role: "checkbox" | "switch"): Scenario => {
	return async (page) => {
		const control = page.getByRole(role).first();
		const before = await control.getAttribute("aria-checked");
		await control.click();
		await expect(control).not.toHaveAttribute("aria-checked", before ?? "");
	};
};

const scenarios: Record<string, Scenario> = {
	"icon-button": async (page) => {
		await page.getByRole("button", { name: "Like", exact: true }).click();
		await expect(page.getByRole("button", { name: "Unlike" })).toBeVisible();
	},
	"copy-button": async (page) => {
		await page.getByRole("button").first().click();
	},
	"toggle-group": async (page) => {
		const center = page.getByRole("button", { name: "Align center" });
		await center.click();
		await expect(center).toHaveAttribute("aria-pressed", "true");
	},
	textarea: typeInto,
	"form-field": typeInto,
	input: typeInto,
	checkbox: flipFirst("checkbox"),
	switch: flipFirst("switch"),
	"radio-group": async (page) => {
		const radios = page.getByRole("radio");
		await radios.nth(1).check();
		await expect(radios.nth(1)).toBeChecked();
	},
	combobox: async (page) => {
		await page.getByRole("combobox").first().click();
		await expect(page.getByRole("listbox")).toBeVisible();
		await page.getByRole("option", { name: "React" }).click();
		await expect(page.getByRole("listbox")).toBeHidden();
	},
	select: async (page) => {
		await page.getByRole("combobox").first().click();
		await expect(page.getByRole("listbox")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.getByRole("listbox")).toBeHidden();
	},
	sheet: async (page) => {
		await page.getByRole("button", { name: "Open settings" }).click();
		const sheet = page.getByRole("dialog");
		await expect(sheet).toBeVisible();
		await expect(sheet).toContainText("Settings");
		await page.keyboard.press("Escape");
		await expect(sheet).toBeHidden();
	},
	dialog: async (page) => {
		await page.getByRole("button", { name: "Invite member" }).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
	},
	popover: async (page) => {
		await page.getByRole("button", { name: /Options/ }).click();
		await expect(page.getByLabel("Width")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.getByLabel("Width")).toBeHidden();
	},
	"alert-dialog": async (page) => {
		await page.getByRole("button", { name: "Delete project" }).click();
		const dialog = page.getByRole("alertdialog");
		await expect(dialog).toBeVisible();
		await dialog.getByRole("button", { name: "Delete", exact: true }).click();
		await expect(dialog).toBeHidden();
		await expect(page.getByText("Project deleted.")).toBeVisible();
	},
	toast: async (page) => {
		await page.getByRole("button", { name: "Show toast" }).click();
		await expect(page.getByText("Theme saved").first()).toBeVisible();
	},
	"dropdown-menu": async (page) => {
		await page.getByRole("button", { name: "Options" }).click();
		await expect(page.getByRole("menu")).toBeVisible();
		await page.getByRole("menuitem", { name: "Rename" }).click();
		await expect(page.getByRole("menu")).toBeHidden();
	},
	tabs: async (page) => {
		await page.getByRole("tab", { name: "Security" }).click();
		await expect(page.getByText("Update your password")).toBeVisible();
	},
	"navigation-menu": async (page) => {
		await page.getByRole("button", { name: "Products" }).click();
		await expect(page.getByRole("link", { name: /Themes/ })).toBeVisible();
	},
};

for (const slug of slugs) {
	test(`example ${slug} mounts and works in a consumer app`, async ({ page }) => {
		const errors = collectErrors(page);
		await page.goto(`/?slug=${slug}`);
		await expect(page.locator("body[data-example-ready]")).toBeAttached();
		await expect(page.locator("#root > *").first()).toBeAttached();

		const scenario = scenarios[slug];
		if (scenario) await scenario(page);
		else {
			const button = page.locator("button:enabled").first();
			if (await button.count()) await button.click();
		}
		await page.waitForTimeout(150);
		expect(errors, `console errors from ${slug}`).toEqual([]);
	});
}
