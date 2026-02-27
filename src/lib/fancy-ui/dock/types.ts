export type DataOrientation = "vertical" | "horizontal";
export type Direction = "top" | "middle" | "bottom";

export interface DockContext {
	mouseX: { current: number };
	mouseY: { current: number };
	magnification: number;
	distance: number;
	orientation: DataOrientation;
}

export const DOCK_CONTEXT_KEY = Symbol("dock-context");
