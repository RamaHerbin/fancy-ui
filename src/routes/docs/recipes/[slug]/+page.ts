import { error } from "@sveltejs/kit";
import { getAllRecipes, getRecipe } from "$lib/docs/recipes/registry.js";
import type { EntryGenerator, PageLoad } from "./$types";

export const entries: EntryGenerator = () => getAllRecipes().map(({ slug }) => ({ slug }));

export const load: PageLoad = ({ params }) => {
	const recipe = getRecipe(params.slug);
	if (!recipe) error(404, `Recipe "${params.slug}" not found`);
	return { recipe };
};
