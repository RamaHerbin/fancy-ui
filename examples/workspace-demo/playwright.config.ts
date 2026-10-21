import { defineConfig, devices } from "@playwright/test";

// The demo's browser spec lives with the others in the repo's tests/e2e, but
// it targets this app's static preview on 5295, not the docs site the root
// config starts. Run it from the repo root after `pnpm package` and this
// app's `build`:
//
//   pnpm exec playwright test -c examples/workspace-demo/playwright.config.ts
export default defineConfig({
	testDir: "../../tests/e2e",
	testMatch: "workspace-demo.spec.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "dot" : "list",
	outputDir: "test-results",
	use: {
		baseURL: "http://localhost:5295",
		trace: "on-first-retry",
	},
	projects: [{ name: "workspace-demo", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "pnpm preview",
		cwd: import.meta.dirname,
		port: 5295,
		reuseExistingServer: false,
	},
});
