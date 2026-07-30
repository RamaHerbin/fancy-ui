import { error } from "@sveltejs/kit";
import { getAllComponents, getComponent } from "$lib/fancy-ui/registry.js";
import type { EntryGenerator, PageLoad } from "./$types";

export const entries: EntryGenerator = () => getAllComponents().map(({ slug }) => ({ slug }));

export const load: PageLoad = ({ params }) => {
	const component = getComponent(params.slug);

	if (!component) {
		error(404, `Component "${params.slug}" not found`);
	}

	return { component };
};
