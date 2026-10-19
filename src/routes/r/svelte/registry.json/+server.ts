import { svelteRegistryOutput } from "$lib/server/registry/sources.js";
import type { RequestHandler } from "./$types";

export const prerender = true;

export const GET: RequestHandler = () => {
	return new Response(JSON.stringify(svelteRegistryOutput().index), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
