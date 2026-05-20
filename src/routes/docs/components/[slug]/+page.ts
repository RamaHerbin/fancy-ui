import { error } from "@sveltejs/kit";
import { getComponent } from "$lib/fancy-ui/registry.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
	const component = getComponent(params.slug);

	if (!component) {
		error(404, `Component "${params.slug}" not found`);
	}

	return { component };
};
