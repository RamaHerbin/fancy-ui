import { devices, expect, test, type Page } from "@playwright/test";

// The star counter calls the public API; keep the suite off the network.
test.beforeEach(async ({ page }) => {
	await page.route("https://api.github.com/**", (route) =>
		route.fulfill({ json: { stargazers_count: 0 } })
	);
});

const PAGES = [
	"/",
	"/docs/components/button",
	"/docs/getting-started/installation",
	"/inspiration",
	"/inspiration/saved",
];

// On a mobile-emulated page the layout viewport widens to fit overflowing
// content, so `innerWidth` would follow the bug: compare with the configured width.
async function expectNoOverflow(page: Page, width: number) {
	const m = await metrics(page);
	expect(m.scrollWidth).toBe(width);
	expect(m.maxRight).toBeLessThanOrEqual(width);
}

async function metrics(page: Page) {
	return page.evaluate(() => {
		const header = document.querySelector("header");
		const controls = header
			? [...header.querySelectorAll<HTMLElement>("button, a, kbd")]
					.filter((el) => el.getClientRects().length > 0)
					.map((el) => el.getBoundingClientRect().right)
			: [];
		return {
			scrollWidth: document.documentElement.scrollWidth,
			maxRight: Math.max(0, ...controls),
		};
	});
}

test.describe("phone width (390 px)", () => {
	// iPhone 13 emulation (touch, DPR, UA) on the suite's Chromium; the device's
	// default browser type cannot be switched inside a describe group.
	const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
	test.use({ ...iphone, viewport: { width: 390, height: 844 } });

	for (const path of PAGES) {
		test(`${path} does not scroll horizontally`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("networkidle");
			await expectNoOverflow(page, 390);
		});
	}
});

test.describe("desktop width (1280 px)", () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	for (const path of PAGES) {
		test(`${path} does not scroll horizontally`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("networkidle");
			await expectNoOverflow(page, 1280);
		});
	}
});
