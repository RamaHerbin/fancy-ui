import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// No SvelteKit, no alias to the monorepo: fancy-ui-svelte resolves from
// node_modules, installed from the packed tarball.
//
// The Cameleon section is swapped in at build time, not imported behind a
// runtime `if`: a module that cannot be resolved breaks the whole build, so
// with CONSUMER_CAMELEON unset the rest of the page still builds and renders.
const cameleon = process.env.CONSUMER_CAMELEON === "1" ? "CameleonOn.svelte" : "CameleonOff.svelte";

export default defineConfig({
	plugins: [tailwindcss(), svelte()],
	resolve: {
		alias: {
			"consumer:cameleon": fileURLToPath(new URL(`./src/cameleon/${cameleon}`, import.meta.url)),
		},
	},
});
