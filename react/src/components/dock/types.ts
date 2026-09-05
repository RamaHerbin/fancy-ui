import { createContext, useContext } from "react";

export type DataOrientation = "vertical" | "horizontal";
export type Direction = "top" | "middle" | "bottom";

export interface DockContext {
	/**
	 * The pointer's page X, in a box rather than as a bare number — the shape
	 * the source publishes, kept verbatim so the exported type is unchanged.
	 *
	 * There the box exists so children can read a reactive update through a
	 * stable object; here the box is REBUILT by `Dock` on every pointer frame,
	 * because a mutated object is invisible to React and the new identity is
	 * exactly what re-renders the icons. Only `Dock` ever writes it.
	 */
	mouseX: { current: number };
	/** The pointer's page Y. Same box treatment as `mouseX`. */
	mouseY: { current: number };
	magnification: number;
	distance: number;
	orientation: DataOrientation;
	/**
	 * False when the visitor asked for reduced motion, or when the device has no
	 * real pointer to track. `Dock` owns the two media queries behind it and
	 * `DockIcon` reads it before doing any measuring, so a device that will
	 * never magnify also never pays for a `getBoundingClientRect()` per icon per
	 * frame. Read-only: only `Dock` may write it.
	 */
	readonly magnify: boolean;
}

/**
 * The context `DockIcon` and `DockSeparator` read to find their dock. The
 * source publishes it under a `Symbol` context key; React's own context object
 * plays that role here, so the name is kept and the value is a `React.Context`
 * rather than a symbol.
 *
 * Not re-exported from `index.ts`, because the source's barrel does not export
 * its key either.
 */
export const DOCK_CONTEXT_KEY = createContext<DockContext | undefined>(undefined);
DOCK_CONTEXT_KEY.displayName = "DockContext";

/**
 * Required, not optional: both children read `context.orientation` with no
 * guard, so one rendered outside a `Dock` throws either way. A named error says
 * what went wrong instead of leaving a bare property-of-undefined TypeError.
 */
export function useDockContext(): DockContext {
	const context = useContext(DOCK_CONTEXT_KEY);
	if (context === undefined) {
		throw new Error("DockContext is missing: this component must be rendered inside a <Dock>.");
	}
	return context;
}
