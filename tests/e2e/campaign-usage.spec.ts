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

// WCAG contrast ratio of an element's text colour over its EFFECTIVE
// background: the element's own and its ancestors' backgrounds composited
// bottom-up on white. The colours are resolved through a canvas, so any CSS
// colour syntax reads back as sRGB.
function contrastOf(el: Element): number {
	const ctx = document.createElement("canvas").getContext("2d")!;
	const rgba = (css: string): [number, number, number, number] => {
		ctx.clearRect(0, 0, 1, 1);
		ctx.fillStyle = "#000";
		ctx.fillStyle = css;
		ctx.fillRect(0, 0, 1, 1);
		const d = ctx.getImageData(0, 0, 1, 1).data;
		return [d[0], d[1], d[2], d[3] / 255];
	};
	const lum = ([r, g, b]: number[]) => {
		const f = (c: number) => {
			const v = c / 255;
			return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
	};
	const layers: [number, number, number, number][] = [];
	for (let n: Element | null = el; n; n = n.parentElement) {
		layers.push(rgba(getComputedStyle(n).backgroundColor));
	}
	let back = [255, 255, 255];
	for (const [r, g, b, a] of layers.reverse()) {
		back = [r, g, b].map((c, i) => c * a + back[i] * (1 - a));
	}
	const [fr, fg, fb, fa] = rgba(getComputedStyle(el).color);
	const front = [fr, fg, fb].map((c, i) => c * fa + back[i] * (1 - fa));
	const [hi, lo] = [lum(front), lum(back)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
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

	test("light and dark: every text-bearing part of the toast keeps a readable contrast", async ({
		page,
	}) => {
		await openStage(page, "toast", "&variant=action");
		await page.getByRole("button", { name: "Show toast" }).click();
		const panel = page.locator("[data-variant][data-state='open']").first();
		await expect(panel).toBeVisible();
		// [part, locator, minimum ratio]: text is 4.5:1, the dismiss glyph (an
		// icon with an accessible name) is a graphical object at 3:1.
		const parts = [
			["title", panel.locator("span.font-medium").first(), 4.5],
			["description", panel.locator("span.text-muted-foreground").first(), 4.5],
			["action button", panel.locator(".ft-toast-action"), 4.5],
			["dismiss glyph", panel.getByRole("button", { name: "Dismiss" }), 3],
		] as const;
		for (const dark of [false, true]) {
			await setDark(page, dark);
			for (const [name, loc, min] of parts) {
				await expect(loc, `${name} is present`).toHaveCount(1);
				const ratio = await loc.evaluate(contrastOf);
				expect(
					ratio,
					`dark=${dark} ${name}: contrast ${ratio.toFixed(2)}:1`
				).toBeGreaterThanOrEqual(min);
			}
		}
	});

	test("reduced motion: the toast enters with no running animation, unlike full motion", async ({
		page,
	}) => {
		// The click and the first sample happen in the same task, one frame apart,
		// so a slow runner cannot let the entrance finish before the probe looks.
		const showAndSample = async () => {
			await openStage(page, "toast", "&variant=action");
			const count = await page.getByRole("button", { name: "Show toast" }).evaluate(
				(el) =>
					new Promise<number>((resolve) => {
						(el as HTMLElement).click();
						requestAnimationFrame(() =>
							resolve(
								document
									.getAnimations()
									.filter(
										(a) => a.playState === "running" && Number(a.effect?.getTiming().duration) > 0
									).length
							)
						);
					})
			);
			await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
			return count;
		};
		// Control: with full motion the entrance is animated, so the probe can see it.
		await page.emulateMedia({ reducedMotion: "no-preference" });
		const full = await showAndSample();
		await page.emulateMedia({ reducedMotion: "reduce" });
		const reduced = await showAndSample();
		expect(full, "the probe sees no entrance animation under full motion").toBeGreaterThan(0);
		expect(reduced, "animations still running under reduce").toBe(0);
		const panel = page.locator("[data-variant][data-state='open']").first();
		expect(await panel.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
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

	test("a long toast stays inside the phone viewport and its action can be tapped", async ({
		page,
	}) => {
		// ?frame=fill: the stage is the whole page, so the layout viewport is the
		// phone's and the toaster sits in the phone's own corner.
		await openStage(page, "toast", "&variant=long&frame=fill");
		await page.getByRole("button", { name: "Show toast" }).tap();
		const panel = page.locator("[data-variant][data-state='open']").first();
		await expect(panel).toBeVisible();
		await page.waitForTimeout(500);
		const vw = page.viewportSize()!.width;
		expect(vw, "not a phone-width page").toBeLessThan(500);
		const box = (await panel.boundingBox())!;
		expect(box.x, "the panel starts left of the viewport").toBeGreaterThanOrEqual(0);
		expect(box.x + box.width, "the panel ends right of the viewport").toBeLessThanOrEqual(vw);
		const action = page.getByRole("button", { name: "Download" });
		const ab = (await action.boundingBox())!;
		expect(ab.x).toBeGreaterThanOrEqual(box.x - 1);
		expect(ab.x + ab.width).toBeLessThanOrEqual(box.x + box.width + 1);
		expect(ab.y + ab.height).toBeLessThanOrEqual(box.y + box.height + 1);
		expect(ab.y + ab.height, "the action is below the fold").toBeLessThanOrEqual(
			page.viewportSize()!.height
		);
		// A tap on its centre lands on it, not on something drawn over it.
		const hit = await page.evaluate(
			([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.textContent?.trim(),
			[ab.x + ab.width / 2, ab.y + ab.height / 2]
		);
		expect(hit).toBe("Download");
		await action.tap();
	});
});
