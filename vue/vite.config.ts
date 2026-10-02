import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Library build only — declarations come from `vue-tsc -p tsconfig.build.json`
// (the build script runs both). CSS from component `<style scoped>` blocks is
// extracted into a single dist/styles.css; consumers import
// "fancy-ui-vue/styles.css" once.
//
// No "use client" boundary here (unlike react/vite.config.ts): Vue has no
// server/client component split to annotate — every SFC runs the same on the
// server and in the browser, gated by `onMounted` where it touches the DOM.

export default defineConfig({
	plugins: [vue()],
	build: {
		// Vite's lib-mode default is `minify: "esbuild"`, which renames every
		// top-level identifier — including the component functions themselves.
		// A library must not minify: the consumer's bundler does that, over the
		// whole app, and only after it has read the `/* @__PURE__ */` annotations
		// that minification here would have already obscured.
		//
		// No source maps either, and that is a decision rather than the default
		// falling through: because the output is unminified and `preserveModules`
		// keeps one dist file per source module, the shipped JS already reads
		// like the SFC minus its types, so a map would roughly double the
		// tarball to point at text the consumer can already read. Revisit only
		// if `minify` ever changes.
		minify: false,
		sourcemap: false,
		lib: {
			// "cameleon/index" (not "cameleon") so the emitted entry lands at
			// dist/cameleon/index.js, next to the d.ts vue-tsc already puts there.
			entry: { index: "src/index.ts", "cameleon/index": "src/cameleon/index.ts" },
			formats: ["es"],
			cssFileName: "styles",
		},
		rollupOptions: {
			// preserveModules keeps one dist file per source module so a
			// consumer bundling `import { ShimmerButton }` tree-shakes the other
			// components away — a single chunk would drag every module-scope
			// side effect (gsap plugin registration, three setup) into every
			// app. Must not change after the first publish: it is the artifact
			// shape. CSS is unaffected: lib mode keeps cssCodeSplit off, so
			// every SFC's `<style scoped>` still aggregates into the single
			// dist/styles.css.
			output: {
				preserveModules: true,
				preserveModulesRoot: "src",
				entryFileNames: "[name].js",
			},
			// Regexes so subpath imports (gsap/ScrollTrigger, three/examples/*)
			// stay external too — deps are declared for the consumer's
			// installer, never bundled. `@vue/*` is deliberately NOT listed:
			// nothing in src may import it directly (gated by check-dist-shape's
			// bare-specifier check) — only the `vue` package itself is a peer.
			external: [
				/^vue(\/|$)/,
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
