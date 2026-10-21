import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	// The preview-health sweep builds the site and has its own config
	// (playwright.preview-health.config.ts), the i18n screens sweep likewise
	// (playwright.i18n-screens.config.ts).
	testIgnore: /(preview-health|i18n-screens)\.spec\.ts$/,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:5174",
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "pnpm dev --port 5174 --mode test",
		port: 5174,
		reuseExistingServer: !process.env.CI,
	},
});
