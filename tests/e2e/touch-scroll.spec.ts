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
	"image-trail-cursor": ":has(> .content__img)",
	compare: '[role="slider"]',
};

for (const [slug, selector] of Object.entries(targets)) {
	test(`${slug}: a vertical swipe scrolls the page`, async ({ page }) => {
		await page.goto(`/docs/components/${slug}`, { waitUntil: "domcontentloaded" });
		const el = page.locator(selector).first();
		await el.waitFor({ state: "attached", timeout: 60_000 });
		// Let hydration settle so the component's own listeners are live.
		await page.waitForTimeout(2500);
		// Both demos are in-flow, so bring them into view first.
		await el.scrollIntoViewIfNeeded();
		const box = (await el.boundingBox()) ?? { x: 0, y: 400, width: 390, height: 0 };
		const before = await page.evaluate(() => window.scrollY);
		const x = Math.min(Math.max(box.x + box.width / 2, 20), 370);
		const y = Math.min(Math.max(box.y + box.height / 2, 450), 600);
		// The swipe must start on the component, or the test proves nothing.
		const startsOnTarget = await el.evaluate(
			(node, p) => {
				const hit = document.elementFromPoint(p.x, p.y);
				return hit !== null && (node.contains(hit) || hit.contains(node));
			},
			{ x, y }
		);
		expect(startsOnTarget, "swipe start point lands on the component").toBe(true);
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

// Smoke only: the fluid canvas is a pointer-events-none overlay and its window
// touch listeners were already passive, so this cannot fail on the old code.
test("fluid-cursor: smoke, a vertical swipe still scrolls the page", async ({ page }) => {
	await page.goto("/docs/components/fluid-cursor", { waitUntil: "domcontentloaded" });
	await page.locator("canvas").first().waitFor({ state: "attached", timeout: 60_000 });
	await page.waitForTimeout(2500);
	const before = await page.evaluate(() => window.scrollY);
	await swipeUp(page, 195, 500, 420);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100);
});

test("editorial-engine: an orb still drags with a vertical component, page stays put", async ({
	page,
}) => {
	await page.goto("/docs/components/editorial-engine", { waitUntil: "domcontentloaded" });
	const stage = page.locator(".ee-stage").first();
	await stage.waitFor({ state: "attached", timeout: 60_000 });
	await page.waitForFunction(
		() => {
			const o = document.querySelector(".ee-orb") as HTMLElement | null;
			return o !== null && o.getBoundingClientRect().width > 0;
		},
		undefined,
		{ timeout: 60_000 }
	);
	await stage.scrollIntoViewIfNeeded();
	// Pick an orb whose centre is inside the viewport.
	const orb = await page.evaluate(() => {
		for (const el of document.querySelectorAll<HTMLElement>(".ee-orb")) {
			const r = el.getBoundingClientRect();
			const cx = r.left + r.width / 2;
			const cy = r.top + r.height / 2;
			if (r.width > 0 && cx > 20 && cx < 370 && cy > 80 && cy < 700) {
				el.setAttribute("data-probe", "1");
				return { cx, cy };
			}
		}
		return null;
	});
	expect(orb, "an orb is on screen").not.toBeNull();
	const probe = page.locator('[data-probe="1"]');
	const read = async () => {
		const r = (await probe.boundingBox())!;
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	};
	// A browser-claimed scroll shows up as pointercancel, which drops the drag.
	await page.evaluate(() => {
		(window as unknown as { __pc: number }).__pc = 0;
		window.addEventListener("pointercancel", () => (window as unknown as { __pc: number }).__pc++);
	});
	const scrollBefore = await page.evaluate(() => window.scrollY);
	const start = await read();
	const cdp = await page.context().newCDPSession(page);
	const pt = (x: number, y: number) => [{ x, y }];
	await cdp.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: pt(start.x, start.y),
	});
	// A mostly vertical drag: the browser would claim it as a scroll under pan-y.
	for (let i = 1; i <= 8; i++) {
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: pt(start.x + i * 3, start.y + i * 10),
		});
		await page.waitForTimeout(40);
	}
	await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
	const end = await read();
	expect(end.y - start.y).toBeGreaterThan(40);
	expect(await page.evaluate(() => (window as unknown as { __pc: number }).__pc)).toBe(0);
	expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});
