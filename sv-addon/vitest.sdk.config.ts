import { defineConfig } from "vitest/config";
import { define } from "./vite.config";

const MINUTE = 60_000;

// The official sv/testing matrix (kit-ts, kit-js, vite-ts, vite-js): scaffolds each variant,
// applies the add-on through sv's engine, then runs ONE `pnpm install` for all of them.
// Needs the npm registry (it installs the published fancy-ui-svelte, not the local build).
// The gate that tests the local tarball end to end is scripts/consumers/sv-addon.sh.
export default defineConfig({
	define,
	test: {
		include: ["tests/sdk/**/*.test.ts"],
		globalSetup: ["tests/sdk/setup/global.ts"],
		testTimeout: 3 * MINUTE,
		hookTimeout: 6 * MINUTE,
		expect: { requireAssertions: true },
	},
});
