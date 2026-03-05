import { json, error } from "@sveltejs/kit";
import { initializeSources, getSourceRegistry } from "$lib/builder/sources/index.js";
import type { RequestHandler } from "./$types.js";

/** GET /api/builder/import/sources/:key/items — list items from a source */
export const GET: RequestHandler = async ({ params }) => {
	initializeSources();
	const reg = getSourceRegistry().get(params.key);

	if (!reg || !reg.enabled) {
		error(404, `Source not found: ${params.key}`);
	}

	const items = await reg.source.list();
	return json(items);
};
