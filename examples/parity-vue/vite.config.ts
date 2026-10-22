import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// Dev-only parity stage for scripts/parity/capture.mjs (see src/main.ts).
//
// fancy-ui-vue is consumed from SOURCE, not dist/: every public entry of
// vue/package.json "exports" is aliased onto vue/src, so a fix to a component
// shows up on the next reload with no package build in between. Each SFC
// carries its own <style>, which is why the dist-only "styles.css" entry
// resolves to an empty file here.
const pkg = fileURLToPath(new URL("../../vue", import.meta.url));
const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	plugins: [vue(), tailwindcss()],
	resolve: {
		alias: [
			{ find: /^fancy-ui-vue$/, replacement: `${pkg}/src/index.ts` },
			{ find: /^fancy-ui-vue\/cameleon$/, replacement: `${pkg}/src/cameleon/index.ts` },
			{ find: /^fancy-ui-vue\/tailwind\.css$/, replacement: `${pkg}/tailwind.css` },
			{ find: /^fancy-ui-vue\/styles\.css$/, replacement: `${here}src/no-dist-styles.css` },
			{ find: /^fancy-ui-vue\/package\.json$/, replacement: `${pkg}/package.json` },
		],
		// vue/src resolves "vue" from vue/node_modules; without dedupe the
		// components and this app would run two Vue runtimes (lost injections).
		dedupe: ["vue"],
	},
	server: { port: 5293, strictPort: true },
});
