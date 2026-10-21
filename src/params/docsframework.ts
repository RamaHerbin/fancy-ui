import type { ParamMatcher } from "@sveltejs/kit";

/** The frameworks that have their own component Markdown pages next to Svelte's. */
export const match = ((param: string): param is "react" | "vue" =>
	param === "react" || param === "vue") satisfies ParamMatcher;
