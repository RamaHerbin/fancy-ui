/**
 * Retro OS ornaments as functional components. The Start-button glyph is a
 * static 2x2 pixel grid (one of the skin's four accents per cell), unrelated to
 * the button's variant, so unlike Brutal's arrow it does not need currentColor.
 *
 * `props` is declared so the recipe args a primitive binds land on the
 * component instead of falling through onto the rendered glyph as DOM
 * attributes.
 */
import { h, type FunctionalComponent } from "vue";
import type { RecipeArgs } from "../../types.js";

export const buttonTrailing: FunctionalComponent<RecipeArgs> = () =>
	h(
		"span",
		{
			"aria-hidden": "true",
			style: {
				display: "inline-grid",
				gridTemplateColumns: "6px 6px",
				gridTemplateRows: "6px 6px",
				gap: "1.5px",
				padding: "1.5px",
				background: "#191308",
				flex: "none",
			},
		},
		[
			h("span", { style: { background: "#B8912B" } }),
			h("span", { style: { background: "#A0442F" } }),
			h("span", { style: { background: "#3F62A7" } }),
			h("span", { style: { background: "#3A6B42" } }),
		]
	);

buttonTrailing.props = ["variant", "size", "state"];
