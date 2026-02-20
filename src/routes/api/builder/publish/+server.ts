import { json, error } from '@sveltejs/kit';
import { getStorage } from '$lib/builder/storage/index.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { slug } = body;

	if (!slug || typeof slug !== 'string') {
		error(400, 'Slug is required');
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
