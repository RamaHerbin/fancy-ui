/**
 * Terminal ornaments as programmatic snippets (`createRawSnippet`) in plain
 * TS — a .svelte module exporting markup snippets breaks Vite's esbuild
 * dependency scan (it parses .svelte files as HTML and cannot see snippet
 * exports). The blinking is driven by the `cam-blink` keyframes in
 * terminal.css.
 */
import { createRawSnippet } from "svelte";
import type { RecipeArgs } from "../../types.js";

export const buttonTrailing = createRawSnippet<[RecipeArgs]>(() => ({
	render: () => `<span class="cam-caret" aria-hidden="true">▊</span>`,
}));
