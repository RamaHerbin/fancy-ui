import { json, error } from '@sveltejs/kit';
import { getStorage, isValidSlug, isValidPageDocument } from '$lib/builder/storage/index.js';
import type { RequestHandler } from './$types.js';

function validateSlug(slug: string) {
	if (!isValidSlug(slug)) {
		error(400, 'Invalid page slug');
	}
}

export const GET: RequestHandler = async ({ params }) => {
	validateSlug(params.slug);
	const storage = getStorage();

	try {
		const page = await storage.get(params.slug);
		return json(page);
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
			error(404, `Page not found: ${params.slug}`);
		}
		throw err;
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	validateSlug(params.slug);
	const storage = getStorage();

	let page: unknown;
	try {
		page = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	if (!isValidPageDocument(page)) {
		error(400, 'Invalid page document: must include version, meta (title, slug), and body array');
	}

	// Ensure slug in URL matches slug in body
	if (page.meta.slug !== params.slug) {
		error(400, 'Slug in URL does not match slug in body');
	}

	try {
		await storage.save(page);
		return json({ ok: true, updatedAt: page.meta.updatedAt });
	} catch (err: unknown) {
		if (err instanceof Error) {
			error(400, err.message);
		}
		throw err;
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	validateSlug(params.slug);
	const storage = getStorage();

	try {
		await storage.delete(params.slug);
		return json({ ok: true });
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
			error(404, `Page not found: ${params.slug}`);
		}
		throw err;
	}
};
