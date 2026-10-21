import { defineConfig, devices } from "@playwright/test";

// Run from the monorepo root: the consumer itself installs nothing but the
// tarball and its framework deps, so the test runner comes from the repo.
export default defineConfig({
	testDir: "./tests",
	reporter: "list",
	use: { baseURL: "http://localhost:4173" },
	projects: [{ name: "chromium", use: {
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
		cwd: import.meta.dirname,
		port: 4173,
		reuseExistingServer: false,
	},
});
