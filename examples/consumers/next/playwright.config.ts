import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.CONSUMER_PORT ?? 4317);

export default defineConfig({
	testDir: "./tests",
	timeout: 60_000,
	fullyParallel: false,
	retries: 0,
	reporter: "list",
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		...devices["Desktop Chrome"],
		launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
	},
	projects: [{ name: "chromium", use: { browserName: "chromium" } }],
	webServer: {
		command: `npx next start -p ${port} -H 127.0.0.1`,
		url: `http://127.0.0.1:${port}`,
		reuseExistingServer: false,
		timeout: 60_000,
	},
});
