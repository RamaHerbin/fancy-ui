import { test, expect, devices, type Page } from "@playwright/test";

// Pointer effects must never trap the page scroll on a phone. The swipe goes
// through CDP so the browser itself applies touch-action to the gesture.
const { defaultBrowserType: _browser, ...iphone } = devices["iPhone 13"];
test.use({ ...iphone });
test.setTimeout(90_000);

async function swipeUp(page: Page, x: number, y: number, distance: number) {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send("Input.synthesizeScrollGesture", {
		x,
		y,
		xDistance: 0,
		yDistance: -distance,
		gestureSourceType: "touch",
		speed: 800,
	});
}

const targets: Record<string, string> = {
	"image-trail-cursor": ".content__img",
	"fluid-cursor": "canvas",
	compare: '[role="slider"]',
};

for (const [slug, selector] of Object.entries(targets)) {
	test(`${slug}: a vertical swipe scrolls the page`, async ({ page }) => {
		await page.goto(`/docs/components/${slug}`, { waitUntil: "domcontentloaded" });
		const el = page.locator(selector).first();
		await el.waitFor({ state: "attached", timeout: 60_000 });
		// Let hydration settle so the component's own listeners are live.
		await page.waitForTimeout(2500);
		// The fluid canvas is a fixed full-viewport overlay: swipe from the top of
		// the page. The others are in-flow, so bring them into view first.
		if (slug !== "fluid-cursor") await el.scrollIntoViewIfNeeded();
		const box = (await el.boundingBox()) ?? { x: 0, y: 400, width: 390, height: 0 };
		const before = await page.evaluate(() => window.scrollY);
		const x = Math.min(Math.max(box.x + box.width / 2, 20), 370);
		const y = Math.min(Math.max(box.y + box.height / 2, 450), 600);
		// A long swipe: the emulated finger covers about half its distance in scroll.
		await swipeUp(page, x, y, 420);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100);
	});
}

test("compare: the handle still drags horizontally", async ({ page }) => {
	await page.goto("/docs/components/compare", { waitUntil: "domcontentloaded" });
	const slider = page.locator('[role="slider"]').first();
	await slider.waitFor({ state: "attached", timeout: 60_000 });
	await page.waitForTimeout(2500);
	await slider.scrollIntoViewIfNeeded();
	const box = (await slider.boundingBox())!;
	const before = Number(await slider.getAttribute("aria-valuenow"));
	const y = box.y + box.height / 2;
	const x0 = box.x + box.width * 0.5;
	const cdp = await page.context().newCDPSession(page);
	const pt = (x: number) => [{ x, y }];
	await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(x0) });
	for (let i = 1; i <= 6; i++) {
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: pt(x0 + i * 12),
		});
	}
	await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
	const after = Number(await slider.getAttribute("aria-valuenow"));
	expect(Math.abs(after - before)).toBeGreaterThan(3);
});
