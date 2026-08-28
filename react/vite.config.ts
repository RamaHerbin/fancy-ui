import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Library build only — declarations come from `tsc -p tsconfig.build.json`
// (the build script runs both). CSS from component imports is extracted into a
// single dist/styles.css; consumers import "fancy-ui-react/styles.css" once.
export default defineConfig({
	plugins: [react()],
	build: {
		lib: {
			entry: { index: "src/index.ts", cameleon: "src/cameleon/index.ts" },
			formats: ["es"],
			cssFileName: "styles",
		},
		rollupOptions: {
			// Every built entry is a client module. Rollup strips module-level
			// directives when it bundles, so a `"use client"` written in a
			// source file would not survive into `dist/` — the banner is what
			// actually reaches the consumer. Without it an RSC app importing
			// `fancy-ui-react` classifies the entry as server code and rejects
			// the `useState`/`useMemo` inside `RippleButton`, `Meteors` and
			// the cameleon provider. The whole entry is marked rather than
			// individual components because a single-chunk lib build has no
			// per-component module boundary left to mark.
			output: {
				banner: '"use client";',
			},
			external: [
				"react",
				"react-dom",
				"react/jsx-runtime",
				"react/jsx-dev-runtime",
				"clsx",
				"tailwind-merge",
			],
		},
	},
});
