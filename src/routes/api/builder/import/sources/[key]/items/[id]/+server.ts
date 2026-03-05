import { json, error } from "@sveltejs/kit";
import { initializeSources, getSourceRegistry } from "$lib/builder/sources/index.js";
import { getBuilderStorage, StorageError } from "$lib/builder/storage/index.js";
import type { RequestHandler } from "./$types.js";

/** POST /api/builder/import/sources/:key/items/:id — import a content item */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	initializeSources();
	const reg = getSourceRegistry().get(params.key);

	if (!reg || !reg.enabled) {
		error(404, `Source not found: ${params.key}`);
	}

	// Optional body to override the slug
	let targetSlug: string | undefined;
	try {
		const body = await request.json();
		if (body.targetSlug && typeof body.targetSlug === "string") {
			targetSlug = body.targetSlug;
		}
	} catch {
		// No body or invalid JSON — that's fine
	}

	// Fetch raw content from source
	const raw = await reg.source.get(params.id);

	// Transform to PageDocument
	const page = reg.transformer.parse(raw);

	// Override slug if requested
	if (targetSlug) {
		page.meta.slug = targetSlug;
	}

	// Check for slug conflicts
	const storage = getBuilderStorage(locals.githubToken);
	try {
		await storage.get(page.meta.slug);
		error(409, `Page "${page.meta.slug}" already exists`);
	} catch (err: unknown) {
		if (err instanceof StorageError && err.code === "NOT_FOUND") {
			// Expected — page does not exist yet
		} else if (err && typeof err === "object" && "status" in err) {
			throw err; // Re-throw SvelteKit HttpError (e.g. 409)
		} else if (err instanceof StorageError) {
			error(err.statusCode, err.message);
		} else {
			throw err;
		}
	}

	// Save the imported page
	await storage.save(page);

	return json({ success: true, slug: page.meta.slug, title: page.meta.title }, { status: 201 });
};
