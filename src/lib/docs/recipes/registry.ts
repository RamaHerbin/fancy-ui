/**
 * Recipes: short, end-to-end patterns that combine several components around
 * one interaction. Each recipe has a page (`/docs/recipes/<slug>`), a Markdown
 * twin (`/docs/recipes/<slug>.md`) and a compiled source in all three
 * frameworks (see `./markdown.ts`).
 *
 * The shape of `Recipe` and the two exports below are a contract for the
 * LLM-facing surface (`llms.txt` lists `recipesRegistry` with `recipeUrl`,
 * `recipeMarkdownUrl` and `recipeMarkdown`), so extend it, never reshape it.
 */

import { SITE_URL } from "$lib/site.js";

export interface Recipe {
	/** URL segment and the base name of every source file. */
	slug: string;
	title: string;
	/** One or two sentences: what the user gets and which components carry it. */
	summary: string;
	/** Slugs of the library components the recipe uses (all must exist in the component registry). */
	components: string[];
	/** The pattern, in order. */
	steps: string[];
	/** The mistakes the pattern exists to prevent. */
	pitfalls: string[];
}

export const recipesRegistry: readonly Recipe[] = [
	{
		slug: "save-publish",
		title: "Save and publish",
		summary:
			"A button that shows work in progress, then a success mark only once the request has actually resolved, and a toast with a retry when it fails. Built from Button, StatusMorph and Toast.",
		components: ["button", "status-morph", "toast"],
		steps: [
			"Guard the handler so a second activation while the request runs is ignored, and leave the busy state to StatusMorph in the button's end slot. Setting the Button `loading` as well would draw two spinners at once.",
			"Drive StatusMorph from the same status: `loading` while pending, `success` after the promise resolves, `error` after it rejects. Never set `success` before the request settles.",
			"On failure, raise an `error` toast with a `Retry` action. The action does not close the toast by itself, so dismiss it from the handler and run the request again.",
			"Let StatusMorph return to idle on its own (`resetAfter`); the button is ready for the next save without any extra state.",
		],
		pitfalls: [
			"Showing success optimistically: if the request then fails, the interface has already told the user the work is saved.",
			"Disabling the button while loading: it drops focus and hides the busy state from assistive technology. Keep it enabled and guard the handler instead.",
			"Leaving the error toast to time out: it carries the only way to retry, so it should stay until the user acts or closes it.",
		],
	},
	{
		slug: "undo-toast",
		title: "Undo with a toast",
		summary:
			"Delete optimistically, offer Undo for six seconds with a draining progress bar, and only send the real request when nothing took the deletion back. Built from Toast and Button.",
		components: ["toast", "button"],
		steps: [
			"Remove the item from the list right away and raise a toast with `duration: 6000`, `progress: true` and an `Undo` action.",
			"In the action handler, restore the item at its old position and dismiss the toast. Pressing the action settles `onClose` with `action` before the handler runs.",
			"Commit the deletion from `onClose` for every reason except `action`: `timeout` (the time ran out), `dismiss` (the user closed it), and `evicted` (newer toasts pushed it out of the stack).",
			"Raise one toast per deletion. Each has its own timer and its own `onClose`, so two quick deletions are two independent undo windows.",
		],
		pitfalls: [
			"Committing only on `timeout`: closing the toast or deleting four more items would then silently cancel a deletion the user confirmed by moving on.",
			"Committing on every reason including `action`: Undo would restore the item locally and still delete it on the server.",
			"Mounting the Toaster per page: when it unmounts, pending timers are dropped without firing `onClose`, so a deletion still waiting on its undo window is never committed. Mount one Toaster at the app level.",
			"Expecting hover to restart the clock: pausing keeps what was left, so hovering at 5.9 s of 6 s and leaving still gives the remaining 0.1 s, not a fresh window.",
		],
	},
];

export function getAllRecipes(): readonly Recipe[] {
	return recipesRegistry;
}

export function getRecipe(slug: string): Recipe | undefined {
	return recipesRegistry.find((recipe) => recipe.slug === slug);
}

/** Canonical page URL of a recipe. */
export function recipeUrl(slug: string): string {
	return `${SITE_URL}/docs/recipes/${slug}`;
}

/** Canonical Markdown URL of a recipe. */
export function recipeMarkdownUrl(slug: string): string {
	return `${recipeUrl(slug)}.md`;
}
