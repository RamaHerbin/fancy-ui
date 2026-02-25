import { json, error } from '@sveltejs/kit';
import { getBuilderStorage, isValidSlug, StorageError } from '$lib/builder/storage/index.js';
import type { PageDocument } from '$lib/builder/types/page.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const { title, slug, description, body: pageBody } = body;

	if (!title || typeof title !== 'string') {
		error(400, 'Title is required');
	}
	if (!slug || typeof slug !== 'string' || !isValidSlug(slug)) {
		error(400, 'Valid slug is required (lowercase alphanumeric with hyphens)');
	}

	const storage = getBuilderStorage(locals.githubToken);

	// Check if page already exists
	try {
		await storage.get(slug);
		error(409, `Page "${slug}" already exists`);
	} catch (err: unknown) {
		if (err instanceof StorageError && err.code === 'NOT_FOUND') {
			// Expected — page does not exist yet
		} else if (err && typeof err === 'object' && 'status' in err && err.status === 409) {
			throw err;
		} else {
			// File exists but is corrupted/malformed — don't overwrite
			error(500, 'Failed to verify whether page already exists');
		}
	}

	const now = new Date().toISOString();
	const page: PageDocument = {
		version: 1,
		meta: {
			title,
			slug,
			description: typeof description === 'string' ? description : undefined,
			status: 'draft',
			createdAt: now,
			updatedAt: now
		},
		body: Array.isArray(pageBody) ? pageBody : []
	};

	await storage.save(page);

	return json({ slug: page.meta.slug }, { status: 201 });
};
