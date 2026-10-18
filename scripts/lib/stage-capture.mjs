/**
 * Shared helpers for the scripts that photograph a live demo stage with
 * Playwright: scripts/build-component-thumbs.mjs (docs gallery thumbnails)
 * and scripts/build-inspiration-media.mjs (Inspiration posters).
 */

/**
 * Re-encode a PNG to WebP at the target size, stepping quality down until it
 * fits. Playwright only encodes PNG/JPEG, so Chromium's own canvas encoder
 * does the work in a blank page -- no image dependency.
 *
 * @param {import("@playwright/test").Page} encoderPage a blank page in any context
 * @param {Buffer} png
 * @param {{ width: number, height: number, maxBytes: number, qualityLadder: number[] }} options
 * @returns {Promise<Buffer>}
 */
export async function encodeWebp(encoderPage, png, { width, height, maxBytes, qualityLadder }) {
	const b64 = await encoderPage.evaluate(
		async ({ b64, width, height, maxBytes, ladder }) => {
			const img = new Image();
			img.src = `data:image/png;base64,${b64}`;
			await img.decode();
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			ctx.imageSmoothingQuality = "high";
			ctx.drawImage(img, 0, 0, width, height);
			let out = "";
			for (const q of ladder) {
				out = canvas.toDataURL("image/webp", q);
				// base64 inflates by 4/3
				if (((out.length - 23) * 3) / 4 <= maxBytes) break;
			}
			return out.slice(out.indexOf(",") + 1);
		},
		{ b64: png.toString("base64"), width, height, maxBytes, ladder: qualityLadder }
	);
	return Buffer.from(b64, "base64");
}

/**
 * Pointer-driven demos: rest the pointer on a point, or sweep it across the
 * stage so a trail is mid-flight when the frame is taken.
 *
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").Locator} stage
 * @param {{ hover?: [number, number], sweep?: boolean }} hint
 */
export async function applyPointerHint(page, stage, hint = {}) {
	if (!hint.hover && !hint.sweep) return;
	const box = await stage.boundingBox();
	if (!box) return;
	const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
	if (hint.sweep) {
		await page.mouse.move(...at(0.15, 0.7));
		await page.mouse.move(...at(0.5, 0.35), { steps: 18 });
		await page.mouse.move(...at(0.72, 0.55), { steps: 12 });
	} else {
		await page.mouse.move(...at(0.2, 0.2));
		await page.mouse.move(...at(...hint.hover), { steps: 12 });
		await page.waitForTimeout(350);
	}
}

/**
 * A browser context at 2x (or `scale`) with the motion preference left on, whose pages
 * start with the given localStorage keys already set (theme, motion…).
 *
 * @param {import("@playwright/test").Browser} browser
 * @param {{ theme?: "dark" | "light", scale?: number, viewport?: { width: number, height: number }, localStorage?: Record<string, string> }} options
 */
export async function newCaptureContext(
	browser,
	{
		theme = "dark",
		scale = 2,
		viewport = { width: 1280, height: 900 },
		localStorage: seed = {},
	} = {}
) {
	const context = await browser.newContext({
		deviceScaleFactor: scale,
		viewport,
		colorScheme: theme,
		reducedMotion: "no-preference",
	});
	await context.addInitScript((entries) => {
		try {
			for (const [key, value] of entries) localStorage.setItem(key, value);
		} catch {
			/* storage blocked */
		}
	}, Object.entries(seed));
	return context;
}
