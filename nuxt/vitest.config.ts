import { defineConfig } from "vitest/config";

// Tests boot real Nuxt instances (and, for e2e, a full build + server), so the
// timeouts are generous and files run one at a time: parallel Nuxt builds in
// the same package fight over .nuxt/ and .output/ and exhaust memory.
export default defineConfig({
	test: {
		environment: "node",
		include: ["test/**/*.test.ts"],
		testTimeout: 300_000,
		hookTimeout: 300_000,
		fileParallelism: false,
	},
});
