import { error } from "@sveltejs/kit";
import { getAllRecipes, getRecipe } from "$lib/docs/recipes/registry.js";
import { recipeMarkdown } from "$lib/docs/recipes/markdown.js";
import type { EntryGenerator, RequestHandler } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => getAllRecipes().map(({ slug }) => ({ slug }));

export const GET: RequestHandler = ({ params }) => {
	const recipe = getRecipe(params.slug);
	if (!recipe) error(404, `Recipe "${params.slug}" not found`);
	return new Response(recipeMarkdown(recipe), {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
