import { json, error } from '@sveltejs/kit';
import { getStorage } from '$lib/builder/storage/index.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
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
	const storage = getStorage();
	const page = await request.json();

	// Ensure slug in URL matches slug in body
	if (page.meta?.slug && page.meta.slug !== params.slug) {
		error(400, 'Slug in URL does not match slug in body');
	}

	// Ensure the slug is set
	if (!page.meta) {
		error(400, 'Page meta is required');
	}
	page.meta.slug = params.slug;

	try {
		await storage.save(page);
		return json({ ok: true });
	} catch (err: unknown) {
		if (err instanceof Error) {
			error(400, err.message);
		}
		throw err;
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
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
