import { expect, test } from "@playwright/test";

const HEADING_NAME = /ready to build something/i;
const GITHUB_URL = "https://github.com/ramaherbin/fancy-ui";

// "Get Started" and "GitHub" links also exist in the header and hero section,
// so every query below is scoped to this specific <section> (found by the
// footer CTA's own heading) rather than the whole page.
function footerSection(page: import("@playwright/test").Page) {
	return page.locator("section", { has: page.getByRole("heading", { name: HEADING_NAME }) });
}

test.describe("Landing footer — synthwave scene", () => {
	test("renders the CTA, footer columns, and scene images after scrolling into view", async ({
		page,
	}) => {
		// HeroSection (earlier on the same page) renders a live FluidCursor demo,
		// which intentionally `console.error`s "Unable to initialize WebGL." as
		// its graceful-degradation path (FluidCursor.svelte ~line 333) whenever
		// WebGL isn't available — routine in a headless/CI Chromium without GPU
		// acceleration, and unrelated to the synthwave scene under test here.
		const KNOWN_NOISE = ["Unable to initialize WebGL."];
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error" && !KNOWN_NOISE.includes(msg.text())) {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/");

		const section = footerSection(page);
		const heading = section.getByRole("heading", { name: HEADING_NAME });
		await heading.scrollIntoViewIfNeeded();
		await expect(heading).toBeVisible();

		const getStarted = section.getByRole("link", { name: /get started/i });
		await expect(getStarted).toBeVisible();
		await expect(getStarted).toHaveAttribute("href", "/docs");

		const starOnGitHub = section.getByRole("link", { name: /star on github/i });
		await expect(starOnGitHub).toBeVisible();
		await expect(starOnGitHub).toHaveAttribute("href", GITHUB_URL);
		await expect(starOnGitHub).toHaveAttribute("target", "_blank");

		const footer = section.locator("footer");
		await expect(footer.getByText("Docs", { exact: true })).toBeVisible();
		await expect(footer.getByText("Resources", { exact: true })).toBeVisible();
		await expect(footer.getByText("Community", { exact: true })).toBeVisible();

		// Scene images are `loading="lazy"`; the scroll above brings them near
		// the viewport, but decoding still happens asynchronously.
		const sceneImages = section.locator("[data-layer] img");
		await expect
			.poll(
				() =>
					sceneImages.evaluateAll(
						(imgs) => imgs.filter((img) => (img as HTMLImageElement).naturalWidth > 0).length
					),
				{ timeout: 10000 }
			)
			.toBeGreaterThanOrEqual(4);

		expect(consoleErrors, `unexpected console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
	});

	test("reduced motion: footer still renders and the scene holds a static pose", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");

		const section = footerSection(page);
		const heading = section.getByRole("heading", { name: HEADING_NAME });
		await heading.scrollIntoViewIfNeeded();
		await expect(heading).toBeVisible();

		// Give the (suppressed) master timeline a full second to prove nothing
		// is animating, rather than asserting the instant after mount.
		await page.waitForTimeout(1000);

		// The scene's per-layer gsap effects gate on `scene.timeline()`, which is
		// `null` under reduced motion, so they never touch their own animated
		// element (not merely paused at rest — untouched, no inline style at
		// all). This is a stronger guarantee than sampling the `[data-layer]`
		// wrappers themselves: those wrappers *do* carry an inline
		// `transform: translate(0, 0)` even under reduced motion (the scene's
		// own neutral-pose reset), which is a harmless zero-displacement value
		// but not literally empty/"none".
		const animatedTransforms = await section
			.locator(".sun-halo, .grid-scroll")
			.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform));
		for (const transform of animatedTransforms) {
			expect(transform).toBe("");
		}
		const animatedOpacity = await section
			.locator(".tail-glow")
			.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.opacity));
		for (const opacity of animatedOpacity) {
			expect(opacity).toBe("");
		}

		// The wrapper divs themselves: whatever transform they carry must be a
		// static, zero-displacement pose (not something a running tween would
		// produce), and it must not change over time.
		const wrapperTransformsBefore = await section
			.locator("[data-layer]")
			.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform));
		await page.waitForTimeout(300);
		const wrapperTransformsAfter = await section
			.locator("[data-layer]")
			.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform));
		expect(wrapperTransformsAfter).toEqual(wrapperTransformsBefore);
		for (const transform of wrapperTransformsAfter) {
			expect(
				transform === "" || transform === "none" || /translate\(0(px)?, 0(px)?\)/.test(transform)
			).toBe(true);
		}
	});
});
