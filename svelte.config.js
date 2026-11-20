import nodeAdapter from "@sveltejs/adapter-node";
import vercelAdapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],

	kit: {
		// Two targets. FANCY_ADAPTER=node builds a standalone Node server into
		// `build/` for a self-hosted container (see Dockerfile and
		// server/self-host.mjs); anything else keeps the serverless build.
		//
		// The serverless runtime is pinned: the platform builds with the newest
		// Node that satisfies `engines.node`, and the adapter refuses majors it
		// does not know yet (26 broke every deploy). The build itself may run on
		// any Node.
		adapter:
			process.env.FANCY_ADAPTER === "node"
				? nodeAdapter({ precompress: true })
				: vercelAdapter({ runtime: "nodejs24.x" }),
		prerender: {
			// The static surface is exactly what opts in via `prerender = true` plus the
			// per-route `entries`. Crawling links instead would pull in /builder, whose
			// auth redirect is session-dependent and must not be frozen at build time.
			crawl: false,
		},
	},
};

export default config;
