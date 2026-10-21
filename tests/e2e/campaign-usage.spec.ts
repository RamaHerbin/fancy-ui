import { expect, test, devices, type Page } from "@playwright/test";

// Usage QA for the copy button and the toast: keyboard path, touch, long
// content, light and dark, reduced motion. Driven through the docs preview and
// the parity stage routes (Svelte reference). The clipboard is replaced so the
// outcome does not depend on a browser permission.

async function stubClipboard(page: Page, mode: "ok" | "denied") {
	await page.addInitScript((m) => {
		Object.defineProperty(navigator, "clipboard", {
			value: {
				writeText: () =>
					m === "ok" ? Promise.resolve() : Promise.reject(new DOMException("x", "NotAllowedError")),
			},
			configurable: true,
		});
	}, mode);
}

async function openStage(page: Page, slug: string, query = "") {
	await page.goto(`/_parity/${slug}?theme=light${query}`);
	await page.waitForLoadState("networkidle");
}

async function setDark(page: Page, dark: boolean) {
	await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
}

test.describe("CopyButton usage", () => {
	test("keyboard: Tab focuses it, Enter copies, the label reverts", async ({ page }) => {
		await stubClipboard(page, "ok");
		await openStage(page, "copy-button");
		await page.keyboard.press("Tab");
		const button = page.getByRole("button", { name: "Copy", exact: true });
		await expect(button).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Copy", exact: true })).toBeVisible({
			timeout: 5000,
		});
	});

	test("keyboard: Space copies too, and a denied write shows the failure label", async ({
		page,
	}) => {
		await stubClipboard(page, "denied");
		await openStage(page, "copy-button");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Space");
		await expect(page.getByRole("button", { name: "Copy failed", exact: true })).toBeVisible();
	});

	test("focus ring is visible in light and in dark", async ({ page }) => {
		await openStage(page, "copy-button");
		await page.keyboard.press("Tab");
		const button = page.getByRole("button", { name: "Copy", exact: true });
		const ring = () =>
			button.evaluate((el) => {
				const s = getComputedStyle(el);
				return `${s.outlineStyle}|${s.outlineWidth}|${s.boxShadow}`;
			});
		await setDark(page, false);
		const light = await ring();
		await setDark(page, true);
		const dark = await ring();
		for (const r of [light, dark])
			expect(r === "none|0px|none", `no focus indication: ${r}`).toBe(false);
		await expect(button).toBeVisible();
	});

	test("reduced motion: the copied state still appears and reverts", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await stubClipboard(page, "ok");
		await openStage(page, "copy-button");
		expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
			true
		);
		await page.getByRole("button", { name: "Copy", exact: true }).click();
		await expect(page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Copy", exact: true })).toBeVisible({
			timeout: 5000,
		});
	});
});

test.describe("Toast usage", () => {
	test("keyboard: open from the keyboard, reach the action, dismiss", async ({ page }) => {
		await openStage(page, "toast", "&variant=action");
		await page.keyboard.press("Tab");
		await expect(page.getByRole("button", { name: "Show toast" })).toBeFocused();
		await page.keyboard.press("Enter");
		const undo = page.getByRole("button", { name: "Undo" });
		await expect(undo).toBeVisible();
		let reached = false;
		for (let i = 0; i < 4 && !reached; i += 1) {
			await page.keyboard.press("Tab");
			reached = await undo.evaluate((el) => el === document.activeElement);
		}
		expect(reached, "Undo is not reachable with Tab").toBe(true);
		await page.keyboard.press("Tab");
		await expect(page.getByRole("button", { name: "Dismiss" })).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(undo).toBeHidden();
	});

	test("light and dark: the toast text stays readable against its panel", async ({ page }) => {
		await openStage(page, "toast", "&variant=action");
		await page.getByRole("button", { name: "Show toast" }).click();
		const panel = page.locator("[data-variant][data-state='open']").first();
		await expect(panel).toBeVisible();
		for (const dark of [false, true]) {
			await setDark(page, dark);
			const [fg, bg] = await panel.evaluate((el) => [
				getComputedStyle(el).color,
				getComputedStyle(el).backgroundColor,
			]);
			expect(fg, `dark=${dark}`).not.toBe(bg);
		}
	});

	test("reduced motion: the toast is shown immediately", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await openStage(page, "toast", "&variant=action");
		await page.getByRole("button", { name: "Show toast" }).click();
		await expect(page.getByRole("button", { name: "Undo" })).toBeVisible({ timeout: 1000 });
	});
});

test.describe("on a phone", () => {
	const { defaultBrowserType: _b, ...iphone } = devices["iPhone 13"];
	test.use({ ...iphone });

	test("tap copies", async ({ page }) => {
		await stubClipboard(page, "ok");
		// The docs preview, not the 800 px parity stage, which is wider than a phone.
		await page.goto("/docs/components/copy-button");
		await page.waitForLoadState("networkidle");
		const preview = page.locator("section:has(h2#preview) [data-thumb-stage]");
		await preview.getByRole("button", { name: "Copy", exact: true }).tap();
		await expect(preview.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
	});

	test("a long toast stays inside the viewport and keeps its action reachable", async ({
		page,
	}) => {
		await openStage(page, "toast", "&variant=long");
		// The parity stage is wider than a phone, so its trigger sits off screen:
		// the click is dispatched, the toast itself is what is measured.
		await page.getByRole("button", { name: "Show toast" }).dispatchEvent("click");
		const panel = page.locator("[data-variant][data-state='open']").first();
		await expect(panel).toBeVisible();
		await page.waitForTimeout(500);
		// The parity route is 800 px wide, so the layout viewport is wider than the
		// phone and the toast's fixed corner is not the phone's: the panel is
		// measured against the phone's width and against its own action instead.
		const box = (await panel.boundingBox())!;
		const vw = page.viewportSize()!.width;
		expect(box.width, "the panel is wider than the phone").toBeLessThanOrEqual(vw);
		const ab = (await page.getByRole("button", { name: "Download" }).boundingBox())!;
		expect(ab.x).toBeGreaterThanOrEqual(box.x - 1);
		expect(ab.x + ab.width).toBeLessThanOrEqual(box.x + box.width + 1);
		expect(ab.y + ab.height).toBeLessThanOrEqual(box.y + box.height + 1);
	});
});
