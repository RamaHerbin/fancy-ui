/**
 * The contract ButtonGroup publishes to whatever it wraps.
 *
 * ButtonGroup only owns the seam — the border, the radius, the divider
 * between items. It has no idea what its children are (a Button, a plain
 * `<button>`, an `<a>`), so anything a nested control needs to adapt its own
 * layout has to come through context rather than a prop threaded down
 * through markup ButtonGroup does not control.
 */

export type ButtonGroupOrientation = "horizontal" | "vertical";

/** What the root publishes. Read-only: only the root decides the orientation. */
export interface ButtonGroupContext {
	/** A getter, so reading it in a reactive scope tracks the root's prop. */
	readonly orientation: ButtonGroupOrientation;
}

export const BUTTON_GROUP_CONTEXT_KEY = Symbol("button-group-context");
