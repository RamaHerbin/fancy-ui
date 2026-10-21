import { defineConfig, devices } from "@playwright/test";

/**
 * One Playwright config shape for every consumer app. The runner is the repo's
 * (`@playwright/test` is not a dependency of any consumer); the app under test
 * is the scratch copy outside the repo that scripts/consumers/<name>.sh built,
 * passed as CONSUMER_APP_DIR, served on the free port in CONSUMER_PORT.
 */
export function consumerConfig(
	serve: (port: number) => { command: string; env?: Record<string, string> }
) {
	const appDir = process.env.CONSUMER_APP_DIR;
	if (!appDir)
		throw new Error("CONSUMER_APP_DIR is not set: run the app through scripts/consumers/<name>.sh");
	const port = Number(process.env.CONSUMER_PORT ?? 4310);
	const { command, env } = serve(port);
	const url = `http://127.0.0.1:${port}`;

	return defineConfig({
		testDir: "./tests",
		timeout: 60_000,
		retries: 0,
		fullyParallel: false,
		workers: 1,
		reporter: "list",
		use: { baseURL: url },
		projects: [
			{
				name: "chromium",
				use: {
					...devices["Desktop Chrome"],
					// Software GL so the contained FluidCursor can create a context headless.
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
			command,
			cwd: appDir,
			url,
			env,
			reuseExistingServer: false,
			timeout: 60_000,
		},
	});
}

/** `vite preview` of the scratch build, for the Vite-based apps. */
export const vitePreview = (port: number) => ({
	command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
});
