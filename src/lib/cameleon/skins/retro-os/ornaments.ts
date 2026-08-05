/**
 * Retro OS ornaments as programmatic snippets (`createRawSnippet`) in plain TS.
 * A .svelte module exporting markup snippets breaks Vite's esbuild dependency
 * scan (it parses .svelte files as HTML and cannot see snippet exports), so
 * these static glyphs live here instead. The Start-button glyph is a static
 * 2x2 pixel grid (one of the skin's four accents per cell), unrelated to the
 * button's variant, so unlike Brutal's arrow it does not need currentColor.
 */
import { createRawSnippet } from "svelte";
import type { RecipeArgs } from "../../types.js";

export const buttonTrailing = createRawSnippet<[RecipeArgs]>(() => ({
	render: () =>
		`<span aria-hidden="true" style="display:inline-grid;grid-template-columns:6px 6px;grid-template-rows:6px 6px;gap:1.5px;padding:1.5px;background:#191308;flex:none;">` +
		`<span style="background:#B8912B;"></span>` +
		`<span style="background:#A0442F;"></span>` +
		`<span style="background:#3F62A7;"></span>` +
		`<span style="background:#3A6B42;"></span>` +
		`</span>`,
}));
