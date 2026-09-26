import { error } from "@sveltejs/kit";
import { getAllComponents, getComponent } from "$lib/fancy-ui/registry.js";
import { componentMarkdown } from "$lib/server/llms.js";
import type { EntryGenerator, RequestHandler } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => getAllComponents().map(({ slug }) => ({ slug }));

export const GET: RequestHandler = ({ params }) => {
	const component = getComponent(params.slug);
	if (!component) error(404, `Component "${params.slug}" not found`);
	return new Response(componentMarkdown(component), {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
