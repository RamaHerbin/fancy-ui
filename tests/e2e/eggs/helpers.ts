import { expect, type Page } from "@playwright/test";

export const EGGS_KEY = "fancy-ui-eggs";

/** Generous: the first visit on a cold dev server compiles the whole module graph. */
const HYDRATION_TIMEOUT = 30_000;

/** The home save buttons only carry `aria-pressed` after mount: a hydration signal. */
export async function hydratedHome(page: Page): Promise<void> {
	await expect(page.locator("[data-preview-card] .save[aria-pressed]").first()).toBeAttached({
		timeout: HYDRATION_TIMEOUT,
	});
	await expect
		.poll(() => page.evaluate(() => "fancy" in window), { timeout: HYDRATION_TIMEOUT })
		.toBe(true);
}

export async function hydratedDocs(page: Page): Promise<void> {
	await page.waitForLoadState("networkidle");
	await expect
		.poll(() => page.evaluate(() => "fancy" in window), { timeout: HYDRATION_TIMEOUT })
		.toBe(true);
}

/** Seeds a localStorage entry before any page script runs. */
export async function seed(page: Page, key: string, value: string): Promise<void> {
	await page.addInitScript(
		([k, v]) => {
			try {
				localStorage.setItem(k, v);
			} catch {
				// Storage blocked: the test will see an empty store.
			}
		},
		[key, value] as const
	);
}

export const CHEAT_CODE = [
	"ArrowUp",
	"ArrowUp",
	"ArrowDown",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"ArrowLeft",
	"ArrowRight",
	"b",
	"a",
] as const;

export async function pressCheatCode(page: Page): Promise<void> {
	for (const key of CHEAT_CODE) await page.keyboard.press(key);
}

/** Found egg ids from localStorage (empty when nothing was stored). */
export async function readEggs(page: Page): Promise<string[]> {
	return page.evaluate((key) => {
		try {
			const raw = localStorage.getItem(key);
			const data = raw ? (JSON.parse(raw) as { found?: unknown }) : null;
			return Array.isArray(data?.found) ? (data.found as string[]) : [];
		} catch {
			return [];
		}
	}, EGGS_KEY);
}
