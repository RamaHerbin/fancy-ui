import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// The add-on installs `fancy-ui-svelte@^<this version>` and refuses a Svelte below its peer
// range: both read from the root package at build time so they can never drift.
const { version, peerDependencies } = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version: string; peerDependencies: Record<string, string> };

// FANCY_UI_SV_VERSION overrides the version for a build that must install from the registry
// before the root version is published (the consumer test on a release bump).
export const define = {
	__FANCY_VERSION__: JSON.stringify(process.env.FANCY_UI_SV_VERSION || version),
	__SVELTE_PEER__: JSON.stringify(peerDependencies.svelte),
};

// One self-contained ESM file for Node. sv loads community add-ons without installing their
// dependencies, so everything is bundled (@sveltejs/sv-utils included) except `sv` itself,
// which the add-on shares with the CLI that loads it (peer dependency).
export default defineConfig({
	define,
	build: {
		ssr: "src/index.ts",
		outDir: "dist",
		emptyOutDir: true,
		target: "node20",
		minify: false,
		rollupOptions: {
			external: ["sv", /^node:/],
			output: { format: "es", entryFileNames: "index.mjs" },
		},
	},
	ssr: { noExternal: true, target: "node" },
});
