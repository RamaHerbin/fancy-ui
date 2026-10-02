/**
 * Brutal ornaments as functional components. currentColor makes the arrow
 * track the button's per-variant text color.
 *
 * `props` is declared so the recipe args a primitive binds land on the
 * component instead of falling through onto the rendered glyph as DOM
 * attributes.
 */
import { h, type FunctionalComponent } from "vue";
import type { RecipeArgs } from "../../types.js";

export const buttonTrailing: FunctionalComponent<RecipeArgs> = () =>
	h(
		"svg",
		{
			width: "12",
			height: "12",
			viewBox: "0 0 14 14",
			"aria-hidden": "true",
			style: { display: "block", flex: "none" },
		},
		[
			h("path", {
				d: "M3 11 L11 3 M4.5 3 L11 3 L11 9.5",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "1.9",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
			}),
		]
	);

buttonTrailing.props = ["variant", "size", "state"];
