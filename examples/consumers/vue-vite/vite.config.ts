import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// No alias, no monorepo path: fancy-ui-vue resolves from node_modules,
// installed from the packed tarball like any outsider's project.
export default defineConfig({
	plugins: [vue(), tailwindcss()],
});
