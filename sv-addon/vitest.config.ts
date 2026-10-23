import { defineConfig } from "vitest/config";
import { define } from "./vite.config";

// Offline suite: pure transforms + the add-on run through sv's own engine on projects
// scaffolded by sv's bundled templates in a temp folder. No install, no network.
export default defineConfig({
	define,
	test: {
		include: ["tests/unit/**/*.test.ts"],
		environment: "node",
	},
});
