import { expect, test, type Page } from "@playwright/test";

// Runs against the workspace demo's static preview on port 5295, started by
// examples/workspace-demo/playwright.config.ts (project "workspace-demo"):
//
//   pnpm package && pnpm -C examples/workspace-demo build
//   pnpm exec playwright test -c examples/workspace-demo/playwright.config.ts
//
// The root config serves the docs site instead, so the spec skips itself
// there rather than failing against a server that is not running.
test.beforeEach(() => {
	test.skip(
		test.info().project.name !== "workspace-demo",
		"runs under examples/workspace-demo/playwright.config.ts"
	);
});

const SCREENS = [
	{ path: "/profile", nav: "Profile", heading: "Profile" },
	{ path: "/settings", nav: "Settings", heading: "Settings" },
	{ path: "/api-keys", nav: "API keys", heading: "API keys" },
	{ path: "/notifications", nav: "Notifications", heading: "Notifications" },
] as const;

/** Collects console errors and uncaught exceptions for the whole test. */
function watchErrors(page: Page) {
	const errors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(`console: ${message.text()}`);
	});
	page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
	return errors;
}

async function open(page: Page, path: string) {
	await page.goto(path);
	// Set from the layout's mount hook: a click before it would land on
	// server markup that is not interactive yet.
	await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

test.describe("workspace demo shell", () => {
	test("the root redirects to the profile screen", async ({ page }) => {
		const errors = watchErrors(page);
		await page.goto("/");
		await expect(page).toHaveURL(/\/profile$/);
		await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
		expect(errors).toEqual([]);
	});

	test("every screen renders inside the shell with one main landmark", async ({ page }) => {
		const errors = watchErrors(page);
		for (const screen of SCREENS) {
			await open(page, screen.path);
			await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
			await expect(page.getByRole("main")).toHaveCount(1);
			await expect(page).toHaveTitle(new RegExp(screen.heading));
			const current = page
				.getByRole("navigation", { name: "Workspace" })
				.getByRole("link", { name: screen.nav, exact: true });
			await expect(current).toHaveAttribute("aria-current", "page");
		}
		expect(errors).toEqual([]);
	});

	test("the sidebar navigates between the four screens", async ({ page }) => {
		const errors = watchErrors(page);
		await open(page, "/profile");
		const nav = page.getByRole("navigation", { name: "Workspace" });
		for (const screen of [...SCREENS].reverse()) {
			await nav.getByRole("link", { name: screen.nav, exact: true }).click();
			await expect(page).toHaveURL(new RegExp(`${screen.path}$`));
			await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
		}
		expect(errors).toEqual([]);
	});

	test("the theme toggle switches and remembers the theme", async ({ page }) => {
		const errors = watchErrors(page);
		await page.emulateMedia({ colorScheme: "light" });
		await open(page, "/settings");
		const html = page.locator("html");
		await expect(html).toHaveClass(/\blight\b/);
		await page.getByRole("button", { name: "Switch to dark theme" }).click();
		await expect(html).toHaveClass(/\bdark\b/);
		await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
		await page.reload();
		await expect(html).toHaveClass(/\bdark\b/);
		expect(errors).toEqual([]);
	});
});

test.describe("workspace demo at 360 px", () => {
	test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

	test("fits the viewport and navigates through the sheet", async ({ page }) => {
		const errors = watchErrors(page);
		await open(page, "/profile");

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);

		// The desktop rail is hidden; the menu button opens the same links in a sheet.
		await expect(page.getByRole("navigation", { name: "Workspace" })).toBeHidden();
		const menu = page.getByRole("button", { name: "Open navigation" });
		await expect(menu).toBeVisible();
		await menu.tap();

		const sheet = page.getByRole("dialog", { name: "Navigation" });
		await expect(sheet).toBeVisible();
		await sheet.getByRole("link", { name: "API keys", exact: true }).tap();

		await expect(page).toHaveURL(/\/api-keys$/);
		await expect(sheet).toBeHidden();
		await expect(page.getByRole("heading", { level: 1, name: "API keys" })).toBeVisible();
		await expect(menu).toBeFocused();
		expect(errors).toEqual([]);
	});

	test("no screen scrolls sideways", async ({ page }) => {
		for (const screen of SCREENS) {
			await open(page, screen.path);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow, screen.path).toBeLessThanOrEqual(0);
		}
	});
});
