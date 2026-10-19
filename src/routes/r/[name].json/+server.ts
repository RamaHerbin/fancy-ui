import { error } from "@sveltejs/kit";
import { registryOutput } from "$lib/server/registry/sources.js";
import type { EntryGenerator, RequestHandler } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () =>
	Object.keys(registryOutput().items).map((name) => ({ name }));

export const GET: RequestHandler = ({ params }) => {
	const { items } = registryOutput();
	const item = Object.hasOwn(items, params.name) ? items[params.name] : undefined;
	if (!item) error(404, `Registry item "${params.name}" not found`);
	return new Response(JSON.stringify(item), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
