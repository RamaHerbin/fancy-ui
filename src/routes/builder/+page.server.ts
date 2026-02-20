import { getStorage } from '$lib/builder/storage/index.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const storage = getStorage();
	const pages = await storage.list();
	return { pages };
};
