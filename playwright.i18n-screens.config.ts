import { defineConfig, devices } from "@playwright/test";

/**
 * i18n layout sweep (tests/e2e/i18n-screens.spec.ts): long, RTL and CJK
 * locales at phone and desktop widths. Runs against the production build.
 *
 *   pnpm test:i18n-screens
 *   I18N_SCREENS_STRICT=1 pnpm test:i18n-screens   # ignore the KNOWN list
 *
 * Env:
 *   I18N_SCREENS_PORT  port the local preview server listens on (default 4174)
 *   I18N_SCREENS_BASE  sweep an already-running site instead; no build, no server
 *   I18N_SCREENS_DIR   where the screenshots go (default test-results/i18n-screens)
 */

const port = Number(process.env.I18N_SCREENS_PORT ?? 4174);
const remote = process.env.I18N_SCREENS_BASE?.replace(/\/$/, "");

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: /i18n-screens\.spec\.ts$/,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : 4,
	reporter: [["list"]],
	use: {
		baseURL: remote ?? `http://localhost:${port}`,
		trace: "off",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: remote
		? undefined
		: {
				command: `pnpm build && pnpm preview --port ${port} --strictPort`,
				port,
				reuseExistingServer: !process.env.CI,
				timeout: 300_000,
			},
});
