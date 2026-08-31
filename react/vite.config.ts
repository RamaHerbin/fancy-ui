import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Library build only — declarations come from `tsc -p tsconfig.build.json`
// (the build script runs both). CSS from component imports is extracted into a
// single dist/styles.css; consumers import "fancy-ui-react/styles.css" once.
export default defineConfig({
	plugins: [react()],
	build: {
		// Vite's lib-mode default is `minify: "esbuild"`, which renames every
		// top-level identifier — including the component functions themselves.
		// `AnimatedBeam` shipped as `function ut(...)` and `Breadcrumb` as
		// `C(function(...))` with no inner name at all, so a consumer's React
		// DevTools tree and every production stack trace read as single letters.
		// A library must not minify: the consumer's bundler does that, over the
		// whole app, and only after it has read the `/* @__PURE__ */` annotations
		// that minification here would have already obscured.
		minify: false,
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
			// A consequence worth knowing before auditing dist/: a component
			// folder's `index.ts` is a pure re-export barrel for 143 of the 144
			// components, and Rollup flattens those into their importer rather
			// than emitting a file — so `dist/components/<name>/index.js` does
			// NOT exist for them (only `book` has one, because its barrel also
			// declares runtime constants). `tsc` still emits every
			// `index.d.ts`, which is what `dist/index.d.ts` resolves types
			// through; nothing imports a barrel at runtime, so there is no
			// missing module. Audit the emitted component entries themselves
			// (`dist/components/<name>/<Component>.js`) — never the barrels.
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
