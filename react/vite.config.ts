import { defineConfig, type Plugin, type Rollup } from "vite";
import react from "@vitejs/plugin-react";
import { USE_CLIENT, clientModules } from "./scripts/client-boundary.mjs";

// Library build only — declarations come from `tsc -p tsconfig.build.json`
// (the build script runs both). CSS from component imports is extracted into a
// single dist/styles.css; consumers import "fancy-ui-react/styles.css" once.

/**
 * Writes `"use client"` onto the emitted modules that need it, and only those.
 *
 * The rule and the reasoning live in `scripts/client-boundary.mjs`, which
 * `scripts/check-dist-shape.mjs` re-runs against the written dist so the two
 * halves cannot drift. It runs in `generateBundle` rather than through
 * Rollup's `output.banner` because the decision is not per-chunk: a module that
 * imports no React still has to become a client module if it CALLS into one,
 * which is only knowable once every chunk has been rendered.
 */
function useClientBoundary(): Plugin {
	return {
		name: "fancy-ui:use-client-boundary",
		apply: "build",
		enforce: "post",
		generateBundle(_options, bundle) {
			const chunks = Object.values(bundle).filter(
				(output): output is Rollup.OutputChunk => output.type === "chunk"
			);
			const client = clientModules(
				chunks.map((chunk) => ({ fileName: chunk.fileName, code: chunk.code }))
			);
			for (const chunk of chunks) {
				if (client.has(chunk.fileName)) chunk.code = `${USE_CLIENT}\n${chunk.code}`;
			}
			this.info(
				`"use client" written to ${client.size} of ${chunks.length} emitted modules`
			);
		},
	};
}

export default defineConfig({
	plugins: [react(), useClientBoundary()],
	build: {
		// Vite's lib-mode default is `minify: "esbuild"`, which renames every
		// top-level identifier — including the component functions themselves.
		// `AnimatedBeam` shipped as `function ut(...)` and `Breadcrumb` as
		// `C(function(...))` with no inner name at all, so a consumer's React
		// DevTools tree and every production stack trace read as single letters.
		// A library must not minify: the consumer's bundler does that, over the
		// whole app, and only after it has read the `/* @__PURE__ */` annotations
		// that minification here would have already obscured.
		//
		// No source maps either, and that is a decision rather than the default
		// falling through: because the output is unminified and `preserveModules`
		// keeps one dist file per source module, the shipped JS already reads
		// like the TSX minus its types, so a map would roughly double the
		// tarball to point at text the consumer can already read. Revisit only
		// if `minify` ever changes.
		minify: false,
		sourcemap: false,
		lib: {
			// "cameleon/index" (not "cameleon") so the emitted entry lands at
			// dist/cameleon/index.js, next to the d.ts tsc already puts there.
			entry: { index: "src/index.ts", "cameleon/index": "src/cameleon/index.ts" },
			formats: ["es"],
			cssFileName: "styles",
		},
		rollupOptions: {
			// The `"use client"` directive comes from the useClientBoundary
			// plugin above, never from a source file: Rollup strips module-level
			// directives when it bundles, so one written in source would not
			// survive into dist/ (convention C-9).
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
