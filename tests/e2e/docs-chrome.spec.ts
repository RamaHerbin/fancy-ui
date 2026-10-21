import { expect, test } from "@playwright/test";
import { collectConsoleErrors, routeGithubApi } from "./_helpers/console-guard";

test.beforeEach(async ({ page }) => {
	await routeGithubApi(page);
});

test.describe("docs chrome", () => {
	test("the header logo points at the landing page, which responds 200", async ({
		page,
		request,
	}) => {
		const guard = collectConsoleErrors(page);
		await page.setViewportSize({ width: 390, height: 800 });
		await page.goto("/docs/components/button");
		const logo = page.locator("header a[data-docs-logo]");
		await expect(logo).toBeVisible();
		await expect(logo).toHaveAttribute("href", "/");
		expect((await request.get("/")).status()).toBe(200);
		expect(guard.errors).toEqual([]);
	});

	test("the sidebar brand points at the landing page on desktop", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/docs/components/button");
		await expect(page.locator("aside a[data-docs-brand]")).toHaveAttribute("href", "/");
		await expect(page.locator("header a[data-docs-logo]")).toBeHidden();
	});

	for (const path of ["/docs/components/button", "/docs/getting-started/installation"]) {
		test(`every breadcrumb link on ${path} responds 200`, async ({ page, request }) => {
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto(path);
			const nav = page.getByRole("navigation", { name: "Documentation breadcrumb" });
			await expect(nav).toBeVisible();
			const hrefs = await nav
				.locator("a")
				.evaluateAll((as) => as.map((a) => a.getAttribute("href")));
			expect(hrefs.length).toBeGreaterThan(0);
			for (const href of hrefs) {
				expect((await request.get(href!)).status(), href!).toBe(200);
			}
		});
	}

	test("the skip link moves focus to #main", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/docs/getting-started/installation");
		await page.keyboard.press("Tab");
		const skip = page.locator("a.docs-skip-link");
		await expect(skip).toBeFocused();
		await expect(skip).toBeInViewport();
		await page.keyboard.press("Enter");
		await expect(page.locator("main#main")).toBeFocused();
	});

	test("DocHeader shows a search button at 390 px", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 800 });
		await page.goto("/docs/components/button");
		const search = page.locator("header").getByRole("button", { name: "Search", exact: true });
		await expect(search).toBeVisible();
	});

	test("the current crumb is not truncated at 390 px with a real star count", async ({ page }) => {
		await page.route("https://api.github.com/**", (route) =>
			route.fulfill({ json: { stargazers_count: 12345 } })
		);
		await page.setViewportSize({ width: 390, height: 800 });
		await page.goto("/docs/components/card-3d");
		const current = page.locator('header nav [aria-current="page"]');
		await expect(current).toHaveText("Card3D");
		const fits = await current.evaluate((el) => el.scrollWidth <= el.clientWidth);
		expect(fits).toBe(true);
	});

	test("the compact contents list shows below xl and hides at xl", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 800 });
		await page.goto("/docs/getting-started/installation");
		await expect(page.locator("details[data-toc-compact]")).toBeVisible();
		await page.setViewportSize({ width: 1440, height: 900 });
		await expect(page.locator("details[data-toc-compact]")).toBeHidden();
	});

	test("?lang=ar sets html lang and dir", async ({ page }) => {
		await page.goto("/docs/components/button?lang=ar");
		await expect(page.locator("html")).toHaveAttribute("lang", "ar");
		await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
	});
});

test.describe("docs footer", () => {
	test.beforeEach(async ({ page }) => {
		// The framework choice is read from storage after mount: start from none.
		await page.addInitScript(() => localStorage.removeItem("fancy-ui-framework"));
	});

	test("shows one version chip per package, each linked to the changelog", async ({ page }) => {
		await page.goto("/docs/components/button");
		const footer = page.locator("footer.docs-footer");
		await footer.scrollIntoViewIfNeeded();
		const chips = footer.locator("a.docs-footer-chip");
		await expect(chips).toHaveCount(3);
		for (const [i, name] of ["fancy-ui-svelte", "fancy-ui-react", "fancy-ui-vue"].entries()) {
			const chip = chips.nth(i);
			await expect(chip).toContainText(name);
			await expect(chip).toContainText(/\d+\.\d+\.\d+/);
			await expect(chip).toHaveAttribute(
				"href",
				/^\/docs\/getting-started\/changelog#.*v\d+-\d+-\d+$/
			);
		}
	});

	test("links to contribute and issues outside the site, and to the in-site changelog", async ({
		page,
	}) => {
		await page.goto("/docs/getting-started/installation");
		const footer = page.locator("footer.docs-footer");
		const contribute = footer.getByRole("link", { name: "Contribute" });
		await expect(contribute).toHaveAttribute("href", /\/blob\/.+\/CONTRIBUTING\.md$/);
		await expect(contribute).toHaveAttribute("target", "_blank");
		await expect(footer.getByRole("link", { name: "Issues", exact: true })).toHaveAttribute(
			"href",
			/\/issues$/
		);
		await expect(footer.getByRole("link", { name: "Changelog" })).toHaveAttribute(
			"href",
			"/docs/getting-started/changelog"
		);
	});

	test("the install line follows the selected framework", async ({ page }) => {
		await page.goto("/docs/components/button");
		const line = page.locator("[data-docs-footer-install]");
		await expect(line).toContainText("pnpm add fancy-ui-svelte");
		await page.goto("/docs/components/button?framework=react");
		await expect(line).toContainText("pnpm add fancy-ui-react");
		await page.goto("/docs/components/button?framework=vue");
		await expect(line).toContainText("pnpm add fancy-ui-vue");
	});

	test("the footer sits on pages of every docs section", async ({ page }) => {
		for (const path of ["/docs/components", "/docs/recipes", "/docs/getting-started/theming"]) {
			await page.goto(path);
			await expect(page.locator("footer.docs-footer"), path).toHaveCount(1);
		}
	});
});
