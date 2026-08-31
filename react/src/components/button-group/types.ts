/**
 * The contract ButtonGroup publishes to whatever it wraps.
 *
 * ButtonGroup only owns the seam — the border, the radius, the divider
 * between items. It has no idea what its children are (a Button, a plain
 * `<button>`, an `<a>`), so anything a nested control needs to adapt its own
 * layout has to come through context rather than a prop threaded down
 * through markup ButtonGroup does not control.
 */

import { createContext } from "react";

export type ButtonGroupOrientation = "horizontal" | "vertical";

/** What the root publishes. Read-only: only the root decides the orientation. */
export interface ButtonGroupContext {
	/**
	 * The root's current orientation. On the Svelte side this is a getter so a
	 * reactive read tracks the root's prop; here the root rebuilds the context
	 * object whenever `orientation` changes, which is what re-renders the
	 * consumers below it — same live behaviour, no getter needed.
	 */
	readonly orientation: ButtonGroupOrientation;
}

/**
 * The context a nested control reads to learn the surrounding group's
 * orientation. The Svelte source publishes it under a `Symbol` context key;
 * React's own context object plays that role here, so the exported name is
 * kept and the value is a `React.Context` rather than a symbol:
 *
 * ```tsx
 * const group = useContext(BUTTON_GROUP_CONTEXT_KEY);
 * ```
 *
 * Read it as optional — a control rendered outside a `ButtonGroup` gets
 * `undefined` rather than throwing.
 */
export const BUTTON_GROUP_CONTEXT_KEY = createContext<ButtonGroupContext | undefined>(undefined);
BUTTON_GROUP_CONTEXT_KEY.displayName = "ButtonGroupContext";
