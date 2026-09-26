/**
 * Terminal ornaments as functional components. The blinking is driven by the
 * `cam-blink` keyframes in terminal.css.
 *
 * `props` is declared so the recipe args a primitive binds land on the
 * component instead of falling through onto the rendered glyph as DOM
 * attributes.
 */
import { h, type FunctionalComponent } from "vue";
import type { RecipeArgs } from "../../types.js";

export const buttonTrailing: FunctionalComponent<RecipeArgs> = () =>
	h("span", { class: "cam-caret", "aria-hidden": "true" }, "▊");

buttonTrailing.props = ["variant", "size", "state"];
