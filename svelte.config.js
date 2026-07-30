import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],

	kit: {
		adapter: adapter(),
		prerender: {
			// The static surface is exactly what opts in via `prerender = true` plus the
			// per-route `entries`. Crawling links instead would pull in /builder, whose
			// auth redirect is session-dependent and must not be frozen at build time.
			crawl: false,
		},
	},
};

export default config;
