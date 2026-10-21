import { error } from "@sveltejs/kit";
import { getAllComponents, getComponent } from "$lib/fancy-ui/registry.js";
import { componentMarkdown, importNamesFor } from "$lib/server/llms.js";
import type { EntryGenerator, RequestHandler } from "./$types";

// The React and Vue editions of /docs/components/<slug>.md. They live on their
// own path, not on a query string, so they can be prerendered like the Svelte
// page: a static host serves files by path and ignores the query.
export const prerender = true;

export const entries: EntryGenerator = () =>
	(["react", "vue"] as const).flatMap((framework) =>
		getAllComponents()
			.filter((c) => importNamesFor(c, framework))
			.map(({ slug }) => ({ framework, slug }))
	);

export const GET: RequestHandler = ({ params }) => {
	const component = getComponent(params.slug);
	if (!component) error(404, `Component "${params.slug}" not found`);
	if (!importNamesFor(component, params.framework)) {
		error(404, `Component "${params.slug}" has no ${params.framework} port`);
	}
	return new Response(componentMarkdown(component, params.framework), {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
