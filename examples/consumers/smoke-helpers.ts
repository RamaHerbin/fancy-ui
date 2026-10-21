import { expect, type Page } from "@playwright/test";

/** Collects console errors and uncaught exceptions from the moment it is called. */
export function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on("console", (m) => {
		if (m.type() === "error") errors.push(m.text());
	});
	page.on("pageerror", (e) => errors.push(String(e)));
	return errors;
}

/**
 * Server-rendered apps paint their markup before the framework attaches its
 * handlers, so a click sent on first paint can land on a dead button. Each
 * SSR consumer sets data-hydrated="true" from its own mount hook; wait for it.
 */
export async function waitForHydration(page: Page) {
	await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
}

/** The colour `var(--primary)` resolves to on this page, never transparent. */
export async function expectPrimaryBackground(page: Page, selector: string) {
	const { bg, token } = await page
		.locator(selector)
		.first()
		.evaluate((el) => {
			const probe = document.createElement("div");
			probe.style.backgroundColor = "var(--primary)";
			document.body.appendChild(probe);
			const token = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return { bg: getComputedStyle(el).backgroundColor, token };
		});
	expect(token).not.toBe("rgba(0, 0, 0, 0)");
	expect(bg).not.toBe("rgba(0, 0, 0, 0)");
	expect(bg).toBe(token);
}

/**
 * BorderBeam rendered AND its stylesheet reached the page: the comet's head
 * exists inside the `.border-beam` root, runs a CSS animation with a non-zero
 * duration, and the root carries the duration custom property the animation
 * reads. Counting children alone would pass with the CSS missing entirely.
 */
export async function expectBorderBeamRunning(page: Page) {
	const beam = page.locator(".border-beam").first();
	await expect(beam).toBeAttached();
	const state = await beam.evaluate((root) => {
		const head = root.querySelector(".bb-head");
		if (!head) return null;
		const cs = getComputedStyle(head);
		const durations = cs.animationDuration.split(",").map((d) => parseFloat(d));
		return {
			name: cs.animationName,
			maxDuration: Math.max(...durations),
			durationVar: getComputedStyle(root).getPropertyValue("--border-beam-duration").trim(),
			position: getComputedStyle(head).position,
		};
	});
	expect(state, "BorderBeam renders its .bb-head element").not.toBeNull();
	expect(state!.position, "BorderBeam stylesheet applied").toBe("absolute");
	expect(state!.name).not.toBe("none");
	expect(state!.maxDuration).toBeGreaterThan(0);
	expect(state!.durationVar).not.toBe("");
}

/**
 * The GPU effect bound a GPU context: the canvas is always in the markup, so
 * its presence proves nothing; a 2d context is refused only when WebGL/WebGPU
 * already owns the canvas.
 */
export async function expectGpuCanvas(page: Page, containerTestId: string) {
	const canvas = page.getByTestId(containerTestId).locator("canvas");
	await expect(canvas).toHaveCount(1);
	await expect
		.poll(() => canvas.evaluate((c) => (c as HTMLCanvasElement).getContext("2d") === null))
		.toBe(true);
}

/** Dialog opens from a focused trigger with Enter and closes with Escape. */
export async function expectKeyboardDialog(page: Page, triggerName: string) {
	await page.getByRole("button", { name: triggerName }).focus();
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
}
