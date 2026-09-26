import { expect, test, type Page } from "@playwright/test";

// FluidCursor and the other WebGL demos log "Unable to initialize WebGL." on
// a headless Chromium without GPU acceleration — their graceful-degradation
// path, not a page error.
const KNOWN_NOISE = ["Unable to initialize WebGL."];

function trackErrors(page: Page) {
	const errors: string[] = [];
	page.on("console", (msg) => {
		if (msg.type() === "error" && !KNOWN_NOISE.some((noise) => msg.text().includes(noise))) {
			errors.push(msg.text());
		}
	});
	page.on("pageerror", (error) => errors.push(error.message));
	return errors;
}

const card = (page: Page, id: string) => page.locator(`article[data-find="${id}"]`);

/** Open /finds and wait until the page is hydrated: the first live demo only
 * mounts client-side, so its button is the hydration marker. Clicking a chip
 * before that would hit the server-rendered markup and do nothing. */
async function openFinds(page: Page, path = "/finds") {
	await page.goto(path);
	await expect(card(page, "magnetic-button").locator(".finds-stage button")).toBeVisible();
}

test.describe("/finds", () => {
	test("mounts live demos near the viewport and keeps the far ones as placeholders", async ({
		page,
	}) => {
		const errors = trackErrors(page);
		// openFinds already asserts the first card's demo (plain CSS) mounted.
		await openFinds(page);
		await expect(page.getByRole("heading", { level: 1 })).toContainText("Interactions");

		// The fluid canvas waits for intent: a hint, no canvas.
		const fluid = card(page, "fluid-cursor");
		await expect(fluid.locator(".finds-stage")).toContainText("MOVE TO EXPLORE");
		await expect(fluid.locator("canvas")).toHaveCount(0);

		// A card far below the fold keeps its placeholder until scrolled to.
		const far = card(page, "pulse-beam");
		await expect(far.locator(".finds-stage-note")).toBeVisible();
		await far.scrollIntoViewIfNeeded();
		await expect(far.locator(".finds-stage-note")).toHaveCount(0);

		expect(errors).toEqual([]);
	});

	test("gesture chips and search narrow the grid", async ({ page }) => {
		await openFinds(page);
		const cards = page.locator("article[data-find]");
		const total = await cards.count();
		expect(total).toBeGreaterThan(20);

		await page.getByRole("button", { name: /^AMBIENT/ }).click();
		await expect(cards).toHaveCount(await page.locator('article[data-gesture="ambient"]').count());
		for (const article of await cards.all()) {
			await expect(article).toHaveAttribute("data-gesture", "ambient");
		}

		await page.getByRole("button", { name: /^ALL/ }).click();
		await page.getByRole("searchbox", { name: "Search finds" }).fill("spring");
		await expect(cards.first()).toBeVisible();
		expect(await cards.count()).toBeLessThan(total);

		await page.getByRole("searchbox", { name: "Search finds" }).fill("zzz-nothing");
		await expect(page.getByText("NO FINDS MATCH")).toBeVisible();
	});

	test("bookmarks persist and the Saved view filters to them", async ({ page }) => {
		await openFinds(page);
		const meteors = card(page, "meteors");
		await meteors.scrollIntoViewIfNeeded();
		await meteors.hover();
		await meteors.getByRole("button", { name: /^Save / }).click();
		await expect(page.getByRole("button", { name: /^SAVED/ })).toContainText("1");

		await page.getByRole("button", { name: /^SAVED/ }).click();
		await expect(page).toHaveURL(/view=saved/);
		await expect(page.locator("article[data-find]")).toHaveCount(1);
		await expect(card(page, "meteors")).toBeVisible();

		await page.reload();
		await expect(page.getByRole("button", { name: /^ALL/ })).toBeVisible();
		await expect(page.locator("article[data-find]")).toHaveCount(1);
		await expect(page.getByRole("button", { name: /^SAVED/ })).toContainText("1");
	});

	test("the tune panel retunes a card in place and returns focus on Escape", async ({ page }) => {
		await openFinds(page);
		const magnetic = card(page, "magnetic-button");
		await magnetic.hover();
		const tune = magnetic.getByRole("button", { name: /^Tune / });
		await tune.click();

		const dialog = page.getByRole("dialog", { name: /Tune Button/ });
		await expect(dialog).toBeVisible();
		const strength = dialog.getByLabel("STRENGTH");
		await strength.fill("0.9");
		await expect(dialog).toContainText("0.9");

		await page.keyboard.press("Escape");
		// Closed = slid off-screen and inert (it keeps a box, so not "hidden").
		await expect(dialog).toHaveAttribute("inert", "");
		await expect(dialog).toHaveAttribute("aria-modal", "false");
		await expect(tune).toBeFocused();
	});

	test("external finds render as study cards with an outbound source link", async ({ page }) => {
		await openFinds(page);
		const ref = card(page, "linear-command-menu");
		await ref.scrollIntoViewIfNeeded();
		await expect(ref).toContainText("SEEN AT");
		const link = ref.getByRole("link", { name: /^Source for/ });
		await expect(link).toHaveAttribute("target", "_blank");
		await expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});
});
