import { expect, test, type Page } from "@playwright/test";

/**
 * The Sound page, audited from outside the app.
 *
 * Unit tests can prove the controller never constructs an AudioContext; only a
 * real browser can prove the *page* never does. Every navigation installs a
 * counting wrapper around `AudioContext` / `webkitAudioContext` before any
 * application script runs, so the counters below cover module evaluation,
 * hydration, route changes, scrolling and hovering — everything that happens
 * without the user asking for sound.
 */

const SOUND_PAGE = "/docs/components/sound";
const OTHER_PAGE = "/docs/components/button";
const STORAGE_KEY = "fancy-ui-sound";

interface AudioProbe {
	ctor: number;
	resume: number;
	/** `state` at construction time — "suspended" whenever the browser's autoplay policy bites. */
	initialStates: string[];
	/** `state` right now, one entry per constructed context. */
	states: string[];
}

/** Reads the counters the init script maintains on `window`. */
function readProbe(page: Page): Promise<AudioProbe> {
	return page.evaluate(() => {
		const probe = (window as unknown as { __audio: Record<string, unknown> }).__audio;
		const instances = probe.instances as { state: string }[];
		return {
			ctor: probe.ctor as number,
			resume: probe.resume as number,
			initialStates: probe.initialStates as string[],
			states: instances.map((instance) => instance.state),
		};
	});
}

function readStoredPreference(page: Page, key: string): Promise<string | null> {
	return page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);
}

test.describe("Sound Lab — silence until asked, then exactly one AudioContext", () => {
	let consoleErrors: string[];
	let hydrationWarnings: string[];

	test.beforeEach(async ({ page }) => {
		consoleErrors = [];
		hydrationWarnings = [];

		// Runs before any page script, on every navigation and reload.
		await page.addInitScript(() => {
			const win = window as unknown as Record<string, unknown>;
			const probe = {
				ctor: 0,
				resume: 0,
				initialStates: [] as string[],
				instances: [] as unknown[],
			};
			win.__audio = probe;

			for (const key of ["AudioContext", "webkitAudioContext"]) {
				const Original = win[key];
				if (typeof Original !== "function") continue;
				win[key] = new Proxy(Original as never, {
					construct(target, args, newTarget) {
						probe.ctor++;
						const instance = Reflect.construct(
							target as never,
							args as never[],
							newTarget as never
						) as { state: string; resume?: () => Promise<void> };
						probe.initialStates.push(instance.state);
						probe.instances.push(instance);
						const resume = instance.resume?.bind(instance);
						if (resume) {
							instance.resume = () => {
								probe.resume++;
								return resume();
							};
						}
						return instance as object;
					},
				});
			}
		});

		page.on("console", (message) => {
			const text = message.text();
			if (message.type() === "error") consoleErrors.push(text);
			if (message.type() === "warning" && /hydrat/i.test(text)) hydrationWarnings.push(text);
		});
		page.on("pageerror", (error) => consoleErrors.push(String(error)));
	});

	test("loading, navigating, scrolling and hovering never construct an AudioContext", async ({
		page,
	}) => {
		await page.goto(SOUND_PAGE);
		const lab = page.locator("[data-sound-lab]").first();
		await expect(lab).toBeVisible();
		expect((await readProbe(page)).ctor).toBe(0);

		// A route change (and a return trip) must not wake the audio graph.
		await page.goto(OTHER_PAGE);
		await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
		expect((await readProbe(page)).ctor).toBe(0);

		await page.goto(SOUND_PAGE);
		await expect(lab).toBeVisible();
		expect((await readProbe(page)).ctor).toBe(0);

		// Passive interaction: scrolling and hovering are not consent.
		await page.mouse.wheel(0, 1200);
		await lab.scrollIntoViewIfNeeded();
		await lab.hover();
		await page.waitForTimeout(250);
		expect((await readProbe(page)).ctor).toBe(0);

		// Nothing was written to storage either — the page is read-only until used.
		const stored = await readStoredPreference(page, STORAGE_KEY);
		if (stored !== null) expect(JSON.parse(stored).enabled).toBe(false);

		expect(hydrationWarnings, hydrationWarnings.join("\n")).toEqual([]);
		expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
	});

	test("switching sound on opens one context that every cue then shares", async ({ page }) => {
		await page.goto(SOUND_PAGE);
		const lab = page.locator("[data-sound-lab]").first();
		await expect(lab).toBeVisible();

		const labSwitch = lab.getByRole("switch", { name: "Sound" }).first();
		await expect(labSwitch).toHaveAttribute("aria-checked", "false");

		await labSwitch.click();
		await expect(labSwitch).toHaveAttribute("aria-checked", "true");

		// The enabling click is itself a user gesture, so the engine is allowed to
		// build its context there — but never more than one.
		let probe = await readProbe(page);
		expect(probe.ctor).toBeLessThanOrEqual(1);

		await lab.getByRole("button", { name: "Play press" }).first().click();
		probe = await readProbe(page);
		expect(probe.ctor).toBe(1);
		expect(probe.states).toEqual(["running"]);
		// The cue is never the only carrier: the card that just played marks itself.
		await expect(lab.locator('[data-played="true"]')).toHaveCount(1);
		await expect(lab.locator('[data-played="true"]')).toContainText("Press");
		// Chromium hands a gesture-created context back already running, so a
		// resume() is only expected when the browser suspended it. The forced
		// case is asserted unconditionally further down.
		if (probe.initialStates[0] !== "running") {
			expect(probe.resume).toBeGreaterThanOrEqual(1);
		}

		for (const cue of ["hover", "toggle-on", "open", "success"]) {
			await lab
				.getByRole("button", { name: `Play ${cue}` })
				.first()
				.click();
		}
		probe = await readProbe(page);
		expect(probe.ctor).toBe(1);

		const stored = await readStoredPreference(page, STORAGE_KEY);
		expect(stored).not.toBeNull();
		expect(JSON.parse(stored as string).enabled).toBe(true);

		expect(hydrationWarnings, hydrationWarnings.join("\n")).toEqual([]);
		expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
	});

	test("a suspended context is resumed by the next Play, not by the page", async ({ page }) => {
		await page.goto(SOUND_PAGE);
		const lab = page.locator("[data-sound-lab]").first();
		await expect(lab).toBeVisible();
		await lab.getByRole("switch", { name: "Sound" }).first().click();
		await lab.getByRole("button", { name: "Play press" }).first().click();
		expect((await readProbe(page)).states).toEqual(["running"]);

		// Simulates what a backgrounded tab, a phone call on iOS, or a strict
		// autoplay policy does to a live context.
		await page.evaluate(async () => {
			const probe = (window as unknown as { __audio: { instances: AudioContext[] } }).__audio;
			await probe.instances[0].suspend();
		});
		const suspended = await readProbe(page);
		expect(suspended.states).toEqual(["suspended"]);
		const resumesBefore = suspended.resume;

		await lab.getByRole("button", { name: "Play copy" }).first().click();
		await expect.poll(async () => (await readProbe(page)).states[0]).toBe("running");

		const after = await readProbe(page);
		expect(after.resume).toBeGreaterThan(resumesBefore);
		// The same click both resumed the context AND produced the cue: the
		// pending-cue replay marks the card once the context is running again.
		await expect(lab.locator('[data-played="true"]')).toContainText("Copy");
		// One deduplicated resume per suspension, not one per dropped cue.
		expect(after.resume - resumesBefore).toBeLessThanOrEqual(2);
		expect(after.ctor).toBe(1);

		expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
	});

	test("the preference survives a reload without playing or allocating anything", async ({
		page,
	}) => {
		await page.goto(SOUND_PAGE);
		const lab = page.locator("[data-sound-lab]").first();
		await expect(lab).toBeVisible();
		await lab.getByRole("switch", { name: "Sound" }).first().click();
		await expect(lab.getByRole("switch", { name: "Sound" }).first()).toHaveAttribute(
			"aria-checked",
			"true"
		);

		await page.reload();

		// The header switch is added to DocHeader.svelte by the orchestrator; it
		// is the same global preference the Lab writes.
		const headerToggle = page.locator("header [data-sound-toggle]").first();
		await expect(headerToggle).toHaveAttribute("aria-checked", "true");
		await expect(lab.getByRole("switch", { name: "Sound" }).first()).toHaveAttribute(
			"aria-checked",
			"true"
		);

		// Restoring "on" must not itself create a context: the browser has had no
		// gesture on this page load, and nothing should sound.
		expect((await readProbe(page)).ctor).toBe(0);

		expect(hydrationWarnings, hydrationWarnings.join("\n")).toEqual([]);
		expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
	});

	test("the header switch is operable from the keyboard alone", async ({ page }) => {
		await page.goto(SOUND_PAGE);
		// The header is server-rendered and inert until hydration; the Lab is
		// client-only, so its presence is the signal that hydration has landed.
		await expect(page.locator("[data-sound-lab]").first()).toBeVisible();
		const headerToggle = page.locator("header [data-sound-toggle]").first();
		await expect(headerToggle).toBeVisible();
		await expect(headerToggle).toHaveAttribute("aria-checked", "false");
		await expect(headerToggle).toHaveAttribute("role", "switch");
		await expect(headerToggle).toHaveAttribute("aria-label", "Sound");

		await headerToggle.focus();
		await expect(headerToggle).toBeFocused();
		await page.keyboard.press("Space");
		await expect(headerToggle).toHaveAttribute("aria-checked", "true");

		// Both switches read the same global preference.
		const labSwitch = page
			.locator("[data-sound-lab]")
			.first()
			.getByRole("switch", { name: "Sound" })
			.first();
		await expect(labSwitch).toHaveAttribute("aria-checked", "true");

		await page.keyboard.press("Space");
		await expect(headerToggle).toHaveAttribute("aria-checked", "false");

		expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
	});
});
