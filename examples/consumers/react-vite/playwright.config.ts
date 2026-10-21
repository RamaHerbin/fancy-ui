import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	reporter: "list",
	use: { baseURL: "http://localhost:4311" },
	projects: [
		{
			name: "chromium",
			// Software GL so the GPU effect can create a WebGL context headless.
			use: {
				...devices["Desktop Chrome"],
				launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
			},
		},
	],
	webServer: {
		command: "npm run preview",
		port: 4311,
		reuseExistingServer: false,
	},
});
