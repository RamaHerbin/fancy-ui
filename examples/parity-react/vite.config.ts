import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev-only parity stage for scripts/parity/capture.mjs (see src/main.tsx).
//
// fancy-ui-react is consumed from SOURCE, not dist/: every public entry of
// react/package.json "exports" is aliased onto react/src, so a fix to a
// component shows up on the next reload with no package build in between.
// Each component imports its own .css from source, which is why the dist-only
// "styles.css" entry resolves to an empty file here.
const pkg = fileURLToPath(new URL("../../react", import.meta.url));
const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [
			{ find: /^fancy-ui-react$/, replacement: `${pkg}/src/index.ts` },
			{ find: /^fancy-ui-react\/cameleon$/, replacement: `${pkg}/src/cameleon/index.ts` },
			{ find: /^fancy-ui-react\/tailwind\.css$/, replacement: `${pkg}/tailwind.css` },
			{ find: /^fancy-ui-react\/styles\.css$/, replacement: `${here}src/no-dist-styles.css` },
			{ find: /^fancy-ui-react\/package\.json$/, replacement: `${pkg}/package.json` },
		],
		// react/src resolves "react" from react/node_modules; without dedupe the
		// components and this app would run two React copies (broken hooks).
		dedupe: ["react", "react-dom"],
	},
	server: { port: 5292, strictPort: true },
});
