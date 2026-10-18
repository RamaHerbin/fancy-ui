export type DataOrientation = "vertical" | "horizontal";
export type Direction = "top" | "middle" | "bottom";

export interface DockContext {
	/** Pointer position in VIEWPORT coordinates (`clientX`), `Infinity` when
	 * the pointer is outside the dock. Viewport, not page, because `DockIcon`
	 * measures itself with `getBoundingClientRect()`, which is viewport-relative. */
	mouseX: { current: number };
	/** Pointer position in viewport coordinates (`clientY`). */
	mouseY: { current: number };
	magnification: number;
	distance: number;
	orientation: DataOrientation;
	/**
	 * False when the visitor asked for reduced motion, or when the device has no
	 * real pointer to track. `Dock` owns the two media queries behind it and
	 * `DockIcon` reads it before sizing itself. Read-only: only `Dock` may
	 * write it.
	 */
	readonly magnify: boolean;
	/**
	 * Whether each icon casts its soft floor reflection (the contact shadow /
	 * glow ellipse under it). Mirrors the `reflection` prop on `Dock`.
	 */
	readonly reflection: boolean;
}

export const DOCK_CONTEXT_KEY = Symbol("dock-context");
