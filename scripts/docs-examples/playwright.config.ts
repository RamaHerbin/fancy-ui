import { defineConfig, devices } from "@playwright/test";

/**
 * Browser half of scripts/check-docs-examples.mjs. The throwaway consumer app
 * (one page, one example per `?slug=`) is written by that script and served
 * from the package folder so it resolves react / vue like a consumer would.
 */
const appDir = process.env.DOCS_EXAMPLES_APP_DIR;
const cwd = process.env.DOCS_EXAMPLES_CWD;
const port = Number(process.env.DOCS_EXAMPLES_PORT ?? 5342);
if (!appDir || !cwd) throw new Error("run this through scripts/check-docs-examples.mjs");

export default defineConfig({
	testDir: ".",
	testMatch: "mount.spec.ts",
	timeout: 30_000,
	retries: 0,
	workers: 1,
	reporter: "list",
	use: { baseURL: `http://127.0.0.1:${port}`, permissions: ["clipboard-read", "clipboard-write"] },
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// Software GL so the GPU examples can create a context headless, as in the
				// consumer apps' own config.
				launchOptions: {
					args: [
						"--use-angle=swiftshader",
						"--enable-unsafe-swiftshader",
						"--ignore-gpu-blocklist",
					],
				},
			},
		},
	],
	webServer: {
		command: `npx vite --config ${appDir}/vite.config.mjs --host 127.0.0.1 --port ${port} --strictPort`,
		cwd,
		url: `http://127.0.0.1:${port}`,
		reuseExistingServer: false,
		timeout: 60_000,
	},
});
