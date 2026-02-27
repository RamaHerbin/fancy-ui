import { json, error } from "@sveltejs/kit";
import { getBuilderStorage, StorageError } from "$lib/builder/storage/index.js";
import { createDefaultSiteConfig, isValidSiteConfig } from "$lib/builder/types/site.js";
import type { SiteConfig } from "$lib/builder/types/site.js";
import type { RequestHandler } from "./$types.js";

export const GET: RequestHandler = async ({ locals }) => {
	const storage = getBuilderStorage(locals.githubToken);
	try {
		const config = await storage.getSiteConfig();
		return json(config ?? createDefaultSiteConfig());
	} catch (err: unknown) {
		if (err instanceof StorageError) {
			error(err.statusCode, err.message);
		}
		throw err;
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, "Invalid JSON body");
	}

	if (!isValidSiteConfig(body)) {
		error(400, "Invalid site config: must include version, title, pageOrder, and navigation");
	}

	const config = body as SiteConfig;
	const storage = getBuilderStorage(locals.githubToken);

	try {
		await storage.saveSiteConfig(config);
	} catch (err: unknown) {
		if (err instanceof StorageError) {
			error(err.statusCode, err.message);
		}
		throw err;
	}

	return json({ ok: true });
};
