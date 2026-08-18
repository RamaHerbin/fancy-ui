/**
 * Retro OS ornaments as plain functions returning JSX. The Start-button glyph
 * is a static 2x2 pixel grid (one of the skin's four accents per cell),
 * unrelated to the button's variant, so unlike Brutal's arrow it does not
 * need currentColor.
 */
import type { ReactNode } from "react";
import type { RecipeArgs } from "../../types.js";

export function buttonTrailing(_args: RecipeArgs): ReactNode {
	return (
		<span
			aria-hidden="true"
			style={{
				display: "inline-grid",
				gridTemplateColumns: "6px 6px",
				gridTemplateRows: "6px 6px",
				gap: "1.5px",
				padding: "1.5px",
				background: "#191308",
				flex: "none",
			}}
		>
			<span style={{ background: "#B8912B" }} />
			<span style={{ background: "#A0442F" }} />
			<span style={{ background: "#3F62A7" }} />
			<span style={{ background: "#3A6B42" }} />
		</span>
	);
}
