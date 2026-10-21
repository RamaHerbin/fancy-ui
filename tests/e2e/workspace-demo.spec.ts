import { expect, test, type Locator, type Page } from "@playwright/test";

// Runs against the workspace demo's static preview on port 5295, started by
// examples/workspace-demo/playwright.config.ts (project "workspace-demo"):
//
//   pnpm package && pnpm -C examples/workspace-demo build
//   pnpm exec playwright test -c examples/workspace-demo/playwright.config.ts
//
// The root config serves the docs site instead, so the spec skips itself
// there rather than failing against a server that is not running.
test.beforeEach(() => {
	test.skip(
		test.info().project.name !== "workspace-demo",
		"runs under examples/workspace-demo/playwright.config.ts"
	);
});

const SCREENS = [
	{
		path: "/profile",
		nav: "Profile",
		heading: "Profile",
		screen: "profile",
		empty: "Finish your profile",
	},
	{
		path: "/settings",
		nav: "Settings",
		heading: "Settings",
		screen: "settings",
		empty: "Set up your workspace",
	},
	{
		path: "/api-keys",
		nav: "API keys",
		heading: "API keys",
		screen: "api-keys",
		empty: "No API keys yet",
	},
	{
		path: "/notifications",
		nav: "Notifications",
		heading: "Notifications",
		screen: "notifications",
		empty: "No notifications yet",
	},
] as const;

/** How long an undo toast counts down, unpaused (src/lib/screens/undo.ts). */
const UNDO_WINDOW_MS = 6000;

/** Collects console errors and uncaught exceptions for the whole test. */
function watchErrors(page: Page) {
	const errors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(`console: ${message.text()}`);
	});
	page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
	return errors;
}

async function open(page: Page, path: string) {
	await page.goto(path);
	// Set from the layout's mount hook: a click before it would land on
	// server markup that is not interactive yet.
	await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

test.describe("workspace demo shell", () => {
	test("the root redirects to the profile screen", async ({ page }) => {
		const errors = watchErrors(page);
		await page.goto("/");
		await expect(page).toHaveURL(/\/profile$/);
		await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
		expect(errors).toEqual([]);
	});

	test("every screen renders inside the shell with one main landmark", async ({ page }) => {
		const errors = watchErrors(page);
		for (const screen of SCREENS) {
			await open(page, screen.path);
			await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
			await expect(page.getByRole("main")).toHaveCount(1);
			await expect(page).toHaveTitle(new RegExp(screen.heading));
			const current = page
				.getByRole("navigation", { name: "Workspace" })
				.getByRole("link", { name: screen.nav, exact: true });
			await expect(current).toHaveAttribute("aria-current", "page");
		}
		expect(errors).toEqual([]);
	});

	test("the sidebar navigates between the four screens", async ({ page }) => {
		const errors = watchErrors(page);
		await open(page, "/profile");
		const nav = page.getByRole("navigation", { name: "Workspace" });
		for (const screen of [...SCREENS].reverse()) {
			await nav.getByRole("link", { name: screen.nav, exact: true }).click();
			await expect(page).toHaveURL(new RegExp(`${screen.path}$`));
			await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
		}
		expect(errors).toEqual([]);
	});

	test("the theme toggle switches and remembers the theme", async ({ page }) => {
		const errors = watchErrors(page);
		await page.emulateMedia({ colorScheme: "light" });
		await open(page, "/settings");
		const html = page.locator("html");
		await expect(html).toHaveClass(/\blight\b/);
		await page.getByRole("button", { name: "Switch to dark theme" }).click();
		await expect(html).toHaveClass(/\bdark\b/);
		await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
		await page.reload();
		await expect(html).toHaveClass(/\bdark\b/);
		expect(errors).toEqual([]);
	});
});

test.describe("workspace demo at 360 px", () => {
	test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

	test("fits the viewport and navigates through the sheet", async ({ page }) => {
		const errors = watchErrors(page);
		await open(page, "/profile");

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);

		// The desktop rail is hidden; the menu button opens the same links in a sheet.
		await expect(page.getByRole("navigation", { name: "Workspace" })).toBeHidden();
		const menu = page.getByRole("button", { name: "Open navigation" });
		await expect(menu).toBeVisible();
		await menu.tap();

		const sheet = page.getByRole("dialog", { name: "Navigation" });
		await expect(sheet).toBeVisible();
		await sheet.getByRole("link", { name: "API keys", exact: true }).tap();

		await expect(page).toHaveURL(/\/api-keys$/);
		await expect(sheet).toBeHidden();
		await expect(page.getByRole("heading", { level: 1, name: "API keys" })).toBeVisible();
		await expect(menu).toBeFocused();
		expect(errors).toEqual([]);
	});

	test("no screen scrolls sideways", async ({ page }) => {
		for (const screen of SCREENS) {
			await open(page, screen.path);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow, screen.path).toBeLessThanOrEqual(0);
		}
	});
});

// ---------------------------------------------------------------------------
// The composed app: each screen's states, save and publish, the undo windows,
// the keyboard, reduced motion and the phone width.
// ---------------------------------------------------------------------------

/** The screen's root, which carries its state (`loading|empty|error|ready`). */
const screenOf = (page: Page, name: string) => page.locator(`[data-screen="${name}"]`);

/** Presses Tab until `target` has focus; fails after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 60) {
	for (let i = 0; i < max; i++) {
		if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
		await page.keyboard.press("Tab");
	}
	await expect(target).toBeFocused();
}

/** Navigates inside the app, keeping its in-memory data (a reload would reseed it). */
async function goVia(page: Page, nav: string) {
	await page
		.getByRole("navigation", { name: "Workspace" })
		.getByRole("link", { name: nav, exact: true })
		.click();
}

function horizontalOverflow(page: Page) {
	return page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
}

test.describe("workspace demo screen states", () => {
	for (const s of SCREENS) {
		test(`${s.path}: loading, then ready`, async ({ page }) => {
			const errors = watchErrors(page);
			await open(page, `${s.path}?latency=slow`);
			const root = screenOf(page, s.screen);
			await expect(root).toHaveAttribute("data-state", "loading");
			await expect(root).toHaveAttribute("aria-busy", "true");
			await expect(root.getByRole("status").first()).toBeAttached();
			await expect(root).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
			await expect(root).toHaveAttribute("aria-busy", "false");
			expect(errors).toEqual([]);
		});

		test(`${s.path}: empty on a first launch`, async ({ page }) => {
			const errors = watchErrors(page);
			await open(page, `${s.path}?scenario=empty&latency=none`);
			const root = screenOf(page, s.screen);
			await expect(root).toHaveAttribute("data-state", "empty");
			await expect(root.getByRole("heading", { level: 2, name: s.empty })).toBeVisible();
			expect(errors).toEqual([]);
		});

		test(`${s.path}: error, then Try again recovers`, async ({ page }) => {
			const errors = watchErrors(page);
			await open(page, `${s.path}?fail=once&latency=fast`);
			const root = screenOf(page, s.screen);
			await expect(root).toHaveAttribute("data-state", "error");
			const alert = root.getByRole("alert");
			await expect(alert).toContainText("This didn’t load");
			await alert.getByRole("button", { name: "Try again" }).click();
			await expect(root).toHaveAttribute("data-state", "ready");
			expect(errors).toEqual([]);
		});
	}

	test("a service that keeps failing keeps the error state, with Try again", async ({ page }) => {
		await open(page, "/notifications?fail=always&latency=none");
		const root = screenOf(page, "notifications");
		await expect(root).toHaveAttribute("data-state", "error");
		await root.getByRole("button", { name: "Try again" }).click();
		await expect(root.getByRole("button", { name: "Try again" })).toBeEnabled();
		await expect(root).toHaveAttribute("data-state", "error");
	});

	test("first launch: the empty state's action opens the form", async ({ page }) => {
		await open(page, "/profile?scenario=empty&latency=none");
		await page.getByRole("button", { name: "Add details" }).click();
		await expect(page.getByRole("textbox", { name: "Name" })).toBeFocused();
	});
});

test.describe("workspace demo save and publish", () => {
	for (const s of [
		{ path: "/profile", screen: "profile", field: "Name", value: "Maya O.", save: "Save changes" },
		{
			path: "/settings",
			screen: "settings",
			field: "Workspace name",
			value: "Orbit",
			save: "Save settings",
		},
	] as const) {
		test(`${s.path}: the button shows the save, a failure offers Retry`, async ({ page }) => {
			const errors = watchErrors(page);
			// fail=once: the first load fails (Try again), then the first save
			// fails (Retry in the toast), then everything succeeds.
			await open(page, `${s.path}?fail=once&latency=fast`);
			const root = screenOf(page, s.screen);
			await root.getByRole("button", { name: "Try again" }).click();
			await expect(root).toHaveAttribute("data-state", "ready");

			const save = root.getByRole("button", { name: s.save });
			const mark = save.locator(".ft-statusmorph");
			await expect(save).toBeDisabled();
			await root.getByRole("textbox", { name: s.field }).fill(s.value);
			await save.click();
			await expect(mark).toHaveAttribute("data-state", "loading");
			await expect(save).toHaveAttribute("aria-busy", "true");

			const retry = page.getByRole("button", { name: "Retry" });
			await expect(retry).toBeVisible();
			await expect(mark).toHaveAttribute("data-state", "error");
			await expect(root.getByRole("textbox", { name: s.field })).toHaveValue(s.value);

			await retry.click();
			await expect(mark).toHaveAttribute("data-state", "success");
			await expect(retry).toBeHidden();
			// The check goes back to rest on its own; the edit is now the baseline.
			await expect(mark).toHaveAttribute("data-state", "idle", { timeout: 5_000 });
			await expect(save).toBeDisabled();
			expect(errors).toEqual([]);
		});
	}
});

test.describe("workspace demo undo windows", () => {
	test("revoking a key: hovering the toast pauses the window, leaving lets it run out and commit", async ({
		page,
	}) => {
		test.slow();
		const errors = watchErrors(page);
		await open(page, "/api-keys?latency=none");
		const list = page.getByRole("list", { name: "API keys" });
		await expect(list.getByRole("listitem")).toHaveCount(3);

		await page.getByRole("button", { name: "Revoke Production deploys" }).click();
		await expect(list.getByRole("listitem")).toHaveCount(2);
		const toast = page.locator(".ft-toast", { hasText: "Revoked Production deploys" });
		const bar = toast.locator(".ft-toast-progress");
		await expect(bar).toHaveAttribute("data-paused", "false");

		await toast.hover();
		await expect(bar).toHaveAttribute("data-paused", "true");
		expect(await bar.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
		// Longer than the whole window: still there, nothing sent.
		await page.waitForTimeout(UNDO_WINDOW_MS + 500);
		await expect(toast).toBeVisible();

		await page.mouse.move(2, 2);
		await expect(bar).toHaveAttribute("data-paused", "false");
		await expect(toast).toBeHidden({ timeout: UNDO_WINDOW_MS + 2_000 });

		// Back on the screen, the list comes from the service: the key is gone.
		await goVia(page, "Notifications");
		await goVia(page, "API keys");
		await expect(list.getByRole("listitem")).toHaveCount(2);
		await expect(page.getByRole("button", { name: "Revoke Production deploys" })).toHaveCount(0);
		expect(errors).toEqual([]);
	});

	test("Undo brings the key back and nothing is revoked", async ({ page }) => {
		await open(page, "/api-keys?latency=none");
		await page.getByRole("button", { name: "Revoke Production deploys" }).click();
		await page.getByRole("button", { name: "Undo" }).click();
		await expect(page.getByRole("button", { name: "Revoke Production deploys" })).toBeFocused();
		await goVia(page, "Notifications");
		await goVia(page, "API keys");
		await expect(page.getByRole("list", { name: "API keys" }).getByRole("listitem")).toHaveCount(3);
	});

	test("two quick revocations are two independent undos", async ({ page }) => {
		await open(page, "/api-keys?latency=none");
		await page.getByRole("button", { name: "Revoke Production deploys" }).click();
		await page.getByRole("button", { name: "Revoke Analytics export" }).click();
		await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(2);
		await page
			.locator(".ft-toast", { hasText: "Revoked Analytics export" })
			.getByRole("button", { name: "Undo" })
			.click();
		await expect(page.getByRole("list", { name: "API keys" }).getByRole("listitem")).toHaveCount(2);
		await expect(page.getByRole("button", { name: "Revoke Analytics export" })).toBeVisible();
	});

	test("notifications: mark all read and clear read are grouped, each with one undo", async ({
		page,
	}) => {
		test.slow();
		const errors = watchErrors(page);
		await open(page, "/notifications?latency=none");
		const root = screenOf(page, "notifications");
		const rows = root.getByRole("list", { name: "Notifications" }).getByRole("listitem");
		await expect(root.getByText("3 unread")).toBeVisible();

		await root.getByRole("button", { name: "Mark all as read" }).click();
		await expect(root.getByText("All caught up")).toBeVisible();
		const marked = page.locator(".ft-toast", { hasText: "Marked 3 notifications as read" });
		await marked.getByRole("button", { name: "Undo" }).click();
		await expect(root.getByText("3 unread")).toBeVisible();
		await expect(root.getByRole("button", { name: "Mark all as read" })).toBeFocused();

		await root.getByRole("button", { name: "Clear read" }).click();
		await expect(rows).toHaveCount(3);
		const cleared = page.locator(".ft-toast", { hasText: "Cleared 3 notifications" });
		await expect(cleared).toBeVisible();
		await expect(cleared).toBeHidden({ timeout: UNDO_WINDOW_MS + 2_000 });

		// Committed: the service no longer has them.
		await goVia(page, "Profile");
		await goVia(page, "Notifications");
		await expect(rows).toHaveCount(3);
		await expect(root.getByRole("button", { name: "Clear read" })).toHaveCount(0);
		expect(errors).toEqual([]);
	});
});

test.describe("workspace demo keyboard path", () => {
	test("skip link, disclosure sections, a switch and save, all from the keyboard", async ({
		page,
	}) => {
		await open(page, "/settings?latency=none");
		const root = screenOf(page, "settings");
		await expect(root).toHaveAttribute("data-state", "ready");

		await page.keyboard.press("Tab");
		await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(page.locator("#main")).toBeFocused();

		const general = root.getByRole("button", { name: "General" });
		await tabTo(page, general);
		await page.keyboard.press("ArrowDown");
		const notifications = root.getByRole("button", { name: "Notifications" });
		await expect(notifications).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(notifications).toHaveAttribute("aria-expanded", "true");

		const mentions = root.getByRole("switch", { name: "Mentions by email" });
		await tabTo(page, mentions);
		await page.keyboard.press("Space");
		await expect(mentions).not.toBeChecked();

		const save = root.getByRole("button", { name: "Save settings" });
		await tabTo(page, save);
		await page.keyboard.press("Enter");
		await expect(save.locator(".ft-statusmorph")).toHaveAttribute("data-state", "success");
	});

	test("revoke and undo from the keyboard, the window held while the toast has focus", async ({
		page,
	}) => {
		await open(page, "/api-keys?latency=none");
		const revoke = page.getByRole("button", { name: "Revoke Production deploys" });
		await tabTo(page, revoke);
		await page.keyboard.press("Enter");
		// Focus moves to the next row rather than falling to the page.
		await expect(page.getByRole("button", { name: "Revoke Analytics export" })).toBeFocused();

		const undo = page.getByRole("button", { name: "Undo" });
		await tabTo(page, undo);
		await expect(page.locator(".ft-toast-progress")).toHaveAttribute("data-paused", "true");
		await page.waitForTimeout(UNDO_WINDOW_MS + 500);
		await expect(undo).toBeVisible();
		await page.keyboard.press("Enter");
		await expect(revoke).toBeFocused();
		await expect(page.getByRole("list", { name: "API keys" }).getByRole("listitem")).toHaveCount(3);
	});
});

test.describe("workspace demo under reduced motion", () => {
	test("the undo bar holds still and sections open without a transition", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await open(page, "/api-keys?latency=none");
		expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
			true
		);
		await page.getByRole("button", { name: "Revoke Production deploys" }).click();
		const bar = page.locator(".ft-toast-progress");
		await expect(bar).toBeVisible();
		expect(await bar.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

		await goVia(page, "Settings");
		const section = page.locator(".ft-collapsible-content").first();
		await expect(section).toBeAttached();
		expect(await section.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe("none");
	});
});

test.describe("workspace demo with motion allowed", () => {
	test("the undo bar drains and sections animate their height", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await open(page, "/api-keys?latency=none");
		await page.getByRole("button", { name: "Revoke Production deploys" }).click();
		const bar = page.locator(".ft-toast-progress");
		await expect(bar).toBeVisible();
		expect(await bar.evaluate((el) => getComputedStyle(el).animationName)).not.toBe("none");

		await goVia(page, "Settings");
		const section = page.locator(".ft-collapsible-content").first();
		await expect(section).toBeAttached();
		expect(await section.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain(
			"grid-template-rows"
		);
	});
});

test.describe("workspace demo journeys at 360 px", () => {
	test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

	test("no state of any screen scrolls sideways", async ({ page }) => {
		const queries = [
			"?latency=slow",
			"?scenario=empty&latency=none",
			"?fail=always&latency=none",
			"?latency=none",
		];
		for (const s of SCREENS) {
			for (const query of queries) {
				await open(page, `${s.path}${query}`);
				expect(await horizontalOverflow(page), `${s.path}${query}`).toBeLessThanOrEqual(0);
			}
		}
	});

	test("revoke and undo by touch, the toast inside the viewport", async ({ page }) => {
		await open(page, "/api-keys?latency=none");
		await page.getByRole("button", { name: "Revoke Production deploys" }).tap();
		const toast = page.locator(".ft-toast", { hasText: "Revoked Production deploys" });
		await expect(toast).toBeVisible();
		const box = await toast.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.x).toBeGreaterThanOrEqual(0);
		expect(box!.x + box!.width).toBeLessThanOrEqual(360);
		expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
		await toast.getByRole("button", { name: "Undo" }).tap();
		await expect(page.getByRole("list", { name: "API keys" }).getByRole("listitem")).toHaveCount(3);
	});
});
