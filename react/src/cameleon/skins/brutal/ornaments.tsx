/**
 * Brutal ornaments as plain functions returning JSX. currentColor makes the
 * arrow track the button's per-variant text color.
 */
import type { ReactNode } from "react";
import type { RecipeArgs } from "../../types.js";

export function buttonTrailing(_args: RecipeArgs): ReactNode {
	return (
		<svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" style={{ display: "block", flex: "none" }}>
			<path
				d="M3 11 L11 3 M4.5 3 L11 3 L11 9.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.9"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
