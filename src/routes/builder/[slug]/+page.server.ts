import { error } from '@sveltejs/kit';
import { getStorage } from '$lib/builder/storage/index.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const storage = getStorage();

	try {
		const page = await storage.get(params.slug);
		return { page };
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
			error(404, `Page not found: ${params.slug}`);
		}
		if (err instanceof Error) {
			error(500, err.message);
		}
		throw err;
	}
};
