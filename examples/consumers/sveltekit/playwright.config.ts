import { defineConfig, devices } from "@playwright/test";

// Run from the monorepo root (the runner comes from the repo). The app under
// test is a copy outside the repo tree, given by CONSUMER_DIR, so it resolves
// packages the way an outsider does.
const appDir = process.env.CONSUMER_DIR ?? import.meta.dirname;

export default defineConfig({
	testDir: "./tests",
	reporter: "list",
	use: { baseURL: "http://localhost:4173" },
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// Software GL so the contained FluidCursor can create a context headless.
				launchOptions: {
					args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
				},
			},
		},
	],
	webServer: {
		command: "npm run preview",
		cwd: appDir,
		port: 4173,
		reuseExistingServer: false,
	},
});
