import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.CONSUMER_PORT ?? 4321);

export default defineConfig({
	testDir: "./tests",
	retries: 0,
	reporter: "list",
	use: { baseURL: `http://localhost:${PORT}` },
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// Software GL so the GPU effect can create a context on a headless runner.
				launchOptions: {
					args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
				},
			},
		},
	],
	webServer: {
		command: "node .output/server/index.mjs",
		url: `http://localhost:${PORT}`,
		env: { PORT: String(PORT), HOST: "127.0.0.1" },
		reuseExistingServer: false,
		timeout: 60_000,
	},
});
