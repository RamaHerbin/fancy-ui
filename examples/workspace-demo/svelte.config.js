import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],
	kit: {
		// Every route is prerendered (src/routes/+layout.ts), so the build is a
		// folder of static files any host can serve. `strict` fails the build if
		// a route ever stops being prerenderable.
		adapter: adapter({ pages: "build", assets: "build", strict: true }),
	},
};

export default config;
