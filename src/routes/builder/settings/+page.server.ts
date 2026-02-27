import { getBuilderStorage } from "$lib/builder/storage/index.js";
import { createDefaultSiteConfig } from "$lib/builder/types/site.js";
import type { PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async ({ locals }) => {
	const storage = getBuilderStorage(locals.githubToken);
	const [config, pages] = await Promise.all([storage.getSiteConfig(), storage.list()]);

	return {
		config: config ?? createDefaultSiteConfig(),
		pages,
	};
};
