/**
 * Terminal ornaments as plain functions returning JSX. The blinking is driven
 * by the `cam-blink` keyframes in terminal.css.
 */
import type { ReactNode } from "react";
import type { RecipeArgs } from "../../types.js";

export function buttonTrailing(_args: RecipeArgs): ReactNode {
	return (
		<span className="cam-caret" aria-hidden="true">
			▊
		</span>
	);
}
