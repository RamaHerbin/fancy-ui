import { json, error } from '@sveltejs/kit';
import { getStorage } from '$lib/builder/storage/index.js';
import type { PageDocument } from '$lib/builder/types/page.js';
import type { RequestHandler } from './$types.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { title, slug, description, body: pageBody } = body;

	if (!title || typeof title !== 'string') {
		error(400, 'Title is required');
	}
	if (!slug || typeof slug !== 'string' || !SLUG_RE.test(slug)) {
		error(400, 'Valid slug is required (lowercase alphanumeric with hyphens)');
	}

	const storage = getStorage();

	// Check if page already exists
	try {
		await storage.get(slug);
		error(409, `Page "${slug}" already exists`);
	} catch (err: unknown) {
		// ENOENT means it doesn't exist — good, we can create it
		if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
			// Expected — page does not exist yet
		} else if (err && typeof err === 'object' && 'status' in err && err.status === 409) {
			throw err;
		} else {
			// For other errors (e.g. malformed), ignore and create fresh
		}
	}

	const now = new Date().toISOString();
	const page: PageDocument = {
		version: 1,
		meta: {
			title,
			slug,
			description: description || undefined,
			status: 'draft',
			createdAt: now,
			updatedAt: now
		},
		body: pageBody ?? []
	};

	await storage.save(page);

	return json({ slug: page.meta.slug }, { status: 201 });
};
