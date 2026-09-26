import { generateRegistryJson } from "$lib/server/llms.js";
import type { RequestHandler } from "./$types";

export const prerender = true;

export const GET: RequestHandler = () => {
	return new Response(JSON.stringify(generateRegistryJson()), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
