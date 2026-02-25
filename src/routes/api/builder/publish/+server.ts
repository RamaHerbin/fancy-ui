import { json, error } from '@sveltejs/kit';
import { getBuilderStorage, isValidSlug, StorageError } from '$lib/builder/storage/index.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
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

	const storage = getBuilderStorage(
		locals.user?.provider === 'supabase' ? { cookies } : { githubToken: locals.githubToken }
	);

	try {
		await storage.publish(slug);
		return json({ ok: true });
	} catch (err: unknown) {
		if (err instanceof StorageError) {
			error(err.statusCode, err.message);
		}
		throw err;
	}
};
