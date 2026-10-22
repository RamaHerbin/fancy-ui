import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// No SvelteKit, no alias to the monorepo: fancy-ui-svelte resolves from
// node_modules, installed from the packed tarball.
export default defineConfig({
	plugins: [tailwindcss(), svelte()],
});
