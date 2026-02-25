import { getBuilderStorage } from '$lib/builder/storage/index.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const storage = getBuilderStorage(
		locals.user?.provider === 'supabase' ? { cookies } : { githubToken: locals.githubToken }
	);
	const pages = await storage.list();
	return { pages };
};
