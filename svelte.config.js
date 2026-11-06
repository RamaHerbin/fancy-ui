import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],

	kit: {
		// The runtime is pinned: Vercel builds with the newest Node that satisfies
		// `engines.node`, and the adapter refuses majors it does not know yet
		// (26 broke every deploy). The build itself may run on any Node.
		adapter: adapter({ runtime: "nodejs24.x" }),
		prerender: {
			// The static surface is exactly what opts in via `prerender = true` plus the
			// per-route `entries`. Crawling links instead would pull in /builder, whose
			// auth redirect is session-dependent and must not be frozen at build time.
			crawl: false,
		},
	},
};

export default config;
