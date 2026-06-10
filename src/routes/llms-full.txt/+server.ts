import { generateLlmsFullTxt } from "$lib/server/llms.js";
import type { RequestHandler } from "./$types";

export const prerender = true;

export const GET: RequestHandler = () => {
	return new Response(generateLlmsFullTxt(), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
