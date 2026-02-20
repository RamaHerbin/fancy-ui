import { json, error } from '@sveltejs/kit';
import { getStorage, isValidSlug } from '$lib/builder/storage/index.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const { slug } = body;

	if (!slug || typeof slug !== 'string' || !isValidSlug(slug)) {
		error(400, 'Valid slug is required');
	}

	const storage = getStorage();

	try {
		await storage.publish(slug);
		return json({ ok: true });
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
			error(404, `Page not found: ${slug}`);
		}
		throw err;
	}
};
