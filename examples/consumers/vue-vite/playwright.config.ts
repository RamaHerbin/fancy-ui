import { defineConfig, devices } from "@playwright/test";

// @playwright/test is NOT a dependency of this app: the runner is the one
// installed at the repo root (see scripts/consumers/vue-vite.sh), so no
// browser download happens here. Only the app under test is the outsider.
export default defineConfig({
	testDir: "./tests",
	timeout: 30_000,
	retries: 0,
	reporter: "list",
	use: { baseURL: "http://localhost:4179" },
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
			},
		},
	],
	webServer: {
		// The app is built in a scratch dir outside the repo (see the script).
		cwd: process.env.CONSUMER_APP_DIR,
		command: "npx vite preview --port 4179 --strictPort",
		url: "http://localhost:4179",
		reuseExistingServer: false,
		timeout: 60_000,
	},
});
