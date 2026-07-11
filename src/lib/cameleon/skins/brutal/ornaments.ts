/**
 * Brutal ornaments as programmatic snippets (`createRawSnippet`) in plain TS.
 * A .svelte module exporting markup snippets breaks Vite's esbuild dependency
 * scan (it parses .svelte files as HTML and cannot see snippet exports), so
 * these static glyphs live here instead. currentColor makes the arrow track
 * the button's per-variant text color.
 */
import { createRawSnippet } from "svelte";
import type { RecipeArgs } from "../../types.js";

export const buttonTrailing = createRawSnippet<[RecipeArgs]>(() => ({
	render: () =>
		`<svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" style="display:block;flex:none;">` +
		`<path d="M3 11 L11 3 M4.5 3 L11 3 L11 9.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>` +
		`</svg>`,
}));
