import { test, expect, devices, type Locator, type Page } from "@playwright/test";

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

// On a cold dev server the docs page probably arrives long before its client
// modules have been compiled, so the demo may be attached and laid out while
// hydration and the web fonts are still in flight (likely cause of the early
// flakes, not confirmed). A fixed sleep could then measure a box that moves, or
// a component without its listeners, and swipe from a stale point. Wait for
// real readiness signals instead: every module fetched, fonts loaded, and the
// element's box unchanged across two animation frames.
async function settled(page: Page, el?: Locator) {
	await page.waitForLoadState("networkidle");
	await page.evaluate(async () => {
		await document.fonts.ready;
	});
	if (!el) return;
	await expect(el).toBeVisible({ timeout: 60_000 });
	await expect
		.poll(
			() =>
				el.evaluate(
					(node) =>
						new Promise<boolean>((resolve) => {
							const a = node.getBoundingClientRect();
							requestAnimationFrame(() =>
								requestAnimationFrame(() => {
									const b = node.getBoundingClientRect();
									resolve(
										a.width > 0 &&
											a.height > 0 &&
											a.x === b.x &&
											a.y === b.y &&
											a.width === b.width &&
											a.height === b.height
									);
								})
							);
						})
				),
			{ message: "the component's box settles", timeout: 30_000 }
		)
		.toBe(true);
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
		await settled(page, el);
		// Both demos are in-flow, so bring them into view first.
		await el.scrollIntoViewIfNeeded();
		await settled(page, el);
		const box = await el.boundingBox();
		expect(box, "the component has a layout box").not.toBeNull();
		if (!box) return;
		const before = await page.evaluate(() => window.scrollY);
		const x = Math.min(Math.max(box.x + box.width / 2, 20), 370);
		const y = Math.min(Math.max(box.y + box.height / 2, 450), 600);
		// The swipe must start on the component, or the test proves nothing: the
		// hit element is the target itself or one of its descendants, never an
		// ancestor that merely encloses it.
		const startsOnTarget = await el.evaluate(
			(node, p) => {
				const hit = document.elementFromPoint(p.x, p.y);
				return hit !== null && node.contains(hit);
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
	await settled(page, slider);
	await slider.scrollIntoViewIfNeeded();
	await settled(page, slider);
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
	await settled(page);
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
	await settled(page, stage);
	await stage.scrollIntoViewIfNeeded();
	await settled(page, stage);
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
