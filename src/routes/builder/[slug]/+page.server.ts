import { error } from '@sveltejs/kit';
import { getBuilderStorage, isValidSlug, StorageError } from '$lib/builder/storage/index.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	if (!isValidSlug(params.slug)) {
		error(400, 'Invalid page slug');
	}

	const storage = getBuilderStorage(
		locals.user?.provider === 'supabase' ? { cookies } : { githubToken: locals.githubToken }
	);

	try {
		const page = await storage.get(params.slug);
		return { page };
	} catch (err: unknown) {
		if (err instanceof StorageError) {
			error(err.statusCode, err.message);
		}
		if (err instanceof Error) {
			error(500, err.message);
		}
		throw err;
	}
};
