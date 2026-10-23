import { defineConfig, devices } from "@playwright/test";

/**
 * Preview-health sweep (tests/e2e/preview-health.spec.ts): one page per
 * shipped component, every preview stage probed. Runs against the production
 * build, not the dev server, so it sees what visitors get.
 *
 *   pnpm test:preview-health                      # gpu + gpu-light-rm
 *   pnpm exec playwright test -c playwright.preview-health.config.ts --project no-gpu
 *                                                 # nightly, no GPU at all
 *   pnpm test:preview-health -g sparkles          # one slug (title match)
 *   pnpm test:preview-health --shard=1/4          # one of the four CI shards; the
 *                                                 # four summaries are merged by
 *                                                 # scripts/preview-health-merge.mjs
 *
 * Env:
 *   PREVIEW_HEALTH_PORT  port the local preview server listens on (default 4173)
 *   PREVIEW_HEALTH_BASE  sweep an already-running site instead (e.g. production);
 *                        no build, no local server
 *
 * Projects:
 *   gpu           dark theme, WebGL through SwiftShader (same flags as the
 *                 visual-parity capture, scripts/parity/capture.mjs)
 *   gpu-light-rm  light theme with prefers-reduced-motion: reduce
 *   no-gpu        default headless Chromium, no GPU flags: shows which demos
 *                 lack a fallback (failures there are classed GPU_ONLY)
 */

const port = Number(process.env.PREVIEW_HEALTH_PORT ?? 4173);
const remote = process.env.PREVIEW_HEALTH_BASE?.replace(/\/$/, "");

/** SwiftShader WebGL, as in scripts/parity/capture.mjs LAUNCH_ARGS. */
const GPU_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--font-render-hinting=none"];

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: /preview-health\.spec\.ts$/,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// SwiftShader renders WebGL on the CPU: more workers starve each other and
	// turn slow pages into spinner timeouts.
	workers: process.env.CI ? 2 : 4,
	timeout: 180_000,
	reporter: [["list"], ["./tests/e2e/preview-health.reporter.ts"]],
	use: {
		baseURL: remote ?? `http://localhost:${port}`,
		trace: "off",
		screenshot: "off",
	},
	projects: [
		{
			name: "gpu",
			metadata: { theme: "dark" },
			use: {
				...devices["Desktop Chrome"],
				colorScheme: "dark",
				launchOptions: { args: GPU_ARGS },
			},
		},
		{
			name: "gpu-light-rm",
			metadata: { theme: "light" },
			use: {
				...devices["Desktop Chrome"],
				colorScheme: "light",
				reducedMotion: "reduce",
				launchOptions: { args: GPU_ARGS },
			},
		},
		{
			name: "no-gpu",
			metadata: { theme: "dark" },
			use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
		},
	],
	webServer: remote
		? undefined
		: {
				command: `pnpm build && pnpm preview --port ${port} --strictPort`,
				port,
				reuseExistingServer: !process.env.CI,
				timeout: 300_000,
			},
});
