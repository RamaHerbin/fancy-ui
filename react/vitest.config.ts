import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	// Docs examples import the published name; resolve it to the source barrel.
	resolve: {
		alias: { "fancy-ui-react": fileURLToPath(new URL("./src/index.ts", import.meta.url)) },
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["src/test-setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
	},
});
