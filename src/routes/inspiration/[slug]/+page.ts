import { error } from "@sveltejs/kit";
import { getPublished, publishedSlugs } from "$lib/inspiration/catalog.js";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => publishedSlugs().map((slug) => ({ slug }));

export const load: PageLoad = ({ params, data }) => {
	const entry = getPublished(params.slug);
	if (!entry) error(404, "Reference not found");
	return { ...data, entry };
};
