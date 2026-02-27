import { getBuilderStorage } from "$lib/builder/storage/index.js";
import type { PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async ({ locals }) => {
  const storage = getBuilderStorage(locals.githubToken);
  const pages = await storage.list();
  return { pages };
};
