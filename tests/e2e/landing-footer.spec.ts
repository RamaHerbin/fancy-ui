import { expect, test } from "@playwright/test";

const HEADING_NAME = /ready to build something/i;
const GITHUB_URL = "https://github.com/RamaHerbin/fancy-ui";

// "Get Started" and "GitHub" links also exist in the header and hero section,
// so every query below is scoped to this specific <section> (found by the
// footer CTA's own heading) rather than the whole page.
function footerSection(page: import("@playwright/test").Page) {
	return page.locator("section", { has: page.getByRole("heading", { name: HEADING_NAME }) });
}

test.describe("Landing footer — synthwave backdrop", () => {
	test("renders the CTA, footer columns, and the decoded backdrop after scrolling into view", async ({
		page,
	}) => {
		// HeroSection (earlier on the same page) renders a live FluidCursor demo,
		// which intentionally `console.error`s "Unable to initialize WebGL." as
		// its graceful-degradation path (FluidCursor.svelte ~line 333) whenever
		// WebGL isn't available — routine in a headless/CI Chromium without GPU
		// acceleration, and unrelated to the synthwave backdrop under test here.
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

		// Exactly ONE backdrop image — asserted before anything iterates over it,
		// so a missing backdrop can never pass vacuously.
		const backdropImg = section.locator("[data-backdrop] img");
		expect(await backdropImg.count()).toBe(1);

		// The image is `loading="lazy"`; the scroll above brings it into the
		// viewport, but decoding still happens asynchronously.
		await expect
			.poll(() => backdropImg.evaluate((img) => (img as HTMLImageElement).naturalWidth), {
				timeout: 10000,
			})
			.toBeGreaterThan(0);

		// The backdrop dissolves into the page through a CSS mask on the scene
		// root (not on the <img>), not an extra overlay element — computed style
		// is the only place that shows up.
		const backdropRoot = section.locator("[data-backdrop]");
		const maskImage = await backdropRoot.evaluate((el) => {
			const style = getComputedStyle(el);
			return (
				style.maskImage ||
				style.getPropertyValue("mask-image") ||
				style.getPropertyValue("-webkit-mask-image")
			);
		});
		expect(maskImage).toContain("linear-gradient");

		expect(consoleErrors, `unexpected console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
	});

	test("the backdrop is fully static: no inline styles, at rest and 400ms later", async ({
		page,
	}) => {
		// Deliberately NO reduced-motion emulation: the scene is 100% static for
		// everyone, so the strongest check is that nothing in the backdrop
		// subtree ever receives an inline `style` attribute — a running tween or
		// pointer-parallax handler could not avoid writing one.
		await page.goto("/");

		const section = footerSection(page);
		const heading = section.getByRole("heading", { name: HEADING_NAME });
		await heading.scrollIntoViewIfNeeded();
		await expect(heading).toBeVisible();

		const backdropSubtree = section.locator("[data-backdrop], [data-backdrop] *");

		const stylesAtT0 = await backdropSubtree.evaluateAll((els) =>
			els.map((el) => el.getAttribute("style"))
		);
		// Sanity floor: the subtree actually rendered (root + picture + sources
		// + img), so the loop below can't pass over an empty list.
		expect(stylesAtT0.length).toBeGreaterThan(4);
		for (const style of stylesAtT0) {
			expect(style).toBeNull();
		}

		await page.waitForTimeout(400);

		const stylesLater = await backdropSubtree.evaluateAll((els) =>
			els.map((el) => el.getAttribute("style"))
		);
		expect(stylesLater).toEqual(stylesAtT0);
		for (const style of stylesLater) {
			expect(style).toBeNull();
		}
	});
});
