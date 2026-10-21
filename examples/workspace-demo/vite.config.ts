import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

// No alias into the monorepo: the app reaches the library only through the
// published entry points of `fancy-ui-svelte` (src/imports.test.ts holds that).
// Port 5295 for both servers, never a fallback: the e2e spec targets it.
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: { port: 5295, strictPort: true },
	preview: { port: 5295, strictPort: true },
	test: {
		environment: "jsdom",
		include: ["src/**/*.test.ts"],
		setupFiles: ["./src/test-setup.ts"],
	},
	resolve: {
		conditions: ["browser"],
	},
});
