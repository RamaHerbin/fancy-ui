export type DataOrientation = "vertical" | "horizontal";
export type Direction = "top" | "middle" | "bottom";

export interface DockContext {
	mouseX: { current: number };
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

export const DOCK_CONTEXT_KEY = Symbol("dock-context");
