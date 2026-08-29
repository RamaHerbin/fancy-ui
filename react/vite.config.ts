import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Library build only — declarations come from `tsc -p tsconfig.build.json`
// (the build script runs both). CSS from component imports is extracted into a
// single dist/styles.css; consumers import "fancy-ui-react/styles.css" once.
export default defineConfig({
	plugins: [react()],
	build: {
		lib: {
			// "cameleon/index" (not "cameleon") so the emitted entry lands at
			// dist/cameleon/index.js, next to the d.ts tsc already puts there.
			entry: { index: "src/index.ts", "cameleon/index": "src/cameleon/index.ts" },
			formats: ["es"],
			cssFileName: "styles",
		},
		rollupOptions: {
			// Every built module is a client module. Rollup strips module-level
			// directives when it bundles, so a `"use client"` written in a
			// source file would not survive into `dist/` — the banner is what
			// actually reaches the consumer. Without it an RSC app importing
			// `fancy-ui-react` classifies the module as server code and rejects
			// the `useState`/`useMemo` inside the components.
			//
			// preserveModules keeps one dist file per source module so a
			// consumer bundling `import { Marquee }` tree-shakes the other
			// components away — a single chunk would drag every module-scope
			// side effect (gsap plugin registration, three setup) into every
			// app. Must not change after the first publish: it is the artifact
			// shape. CSS is unaffected: lib mode keeps cssCodeSplit off, so
			// component CSS still aggregates into the single dist/styles.css.
			output: {
				banner: '"use client";',
				preserveModules: true,
				preserveModulesRoot: "src",
				entryFileNames: "[name].js",
			},
			// Regexes so subpath imports (gsap/ScrollTrigger, three/examples/*)
			// stay external too — deps are declared for the consumer's
			// installer, never bundled.
			external: [
				/^react(\/|$)/,
				/^react-dom(\/|$)/,
				"clsx",
				"tailwind-merge",
				/^three(\/|$)/,
				/^gsap(\/|$)/,
				"canvas-confetti",
				/^@chenglou\/pretext(\/|$)/,
			],
		},
	},
});
