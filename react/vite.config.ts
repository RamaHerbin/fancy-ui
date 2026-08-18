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
