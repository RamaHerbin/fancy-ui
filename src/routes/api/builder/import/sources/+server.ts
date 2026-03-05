import { json } from "@sveltejs/kit";
import { initializeSources, getSourceRegistry } from "$lib/builder/sources/index.js";
import type { RequestHandler } from "./$types.js";

/** GET /api/builder/import/sources — list available content sources */
export const GET: RequestHandler = async () => {
	initializeSources();
	const registry = getSourceRegistry();
	const sources = registry.listEnabled().map(({ key, registration }) => ({
		key,
		name: registration.source.name,
		type: registration.source.type,
	}));
	return json(sources);
};
