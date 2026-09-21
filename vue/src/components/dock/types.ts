import type { InjectionKey } from "vue";
import { inject } from "vue";

export type DataOrientation = "vertical" | "horizontal";
export type Direction = "top" | "middle" | "bottom";

export interface DockContext {
	/**
	 * The pointer's page X, in a box rather than as a bare number — the shape
	 * the source publishes, kept verbatim so the exported type is unchanged.
	 * The box is a `reactive` object written by `Dock` on every pointer frame,
	 * which is how a child's `computed` sees the update through a stable
	 * object identity. Only `Dock` ever writes it.
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
 * The same symbol the source publishes the context under, now carrying the
 * value type so `provide`/`inject` are checked.
 *
 * Not re-exported from `index.ts`, because the source's barrel does not export
 * its key either.
 */
export const DOCK_CONTEXT_KEY: InjectionKey<DockContext> = Symbol("dock-context");

/**
 * What a `DockIcon` or `DockSeparator` mounted outside a `Dock` reads.
 *
 * The Svelte source throws there — `getContext` returns `undefined` and the
 * first property read is a bare TypeError — and the React port throws a named
 * error on purpose. This package can do neither: every exported component is
 * server-rendered on its own by the package-wide SSR sweeps, which have no way
 * to wrap a subcomponent in a provider. Degrading instead is the answer
 * `Sidebar`'s subcomponents already give: a lone icon renders at its resting
 * 40px and a lone separator takes the horizontal rule, with `magnify` false so
 * nothing is ever measured.
 */
const DOCK_FALLBACK: DockContext = Object.freeze({
	mouseX: { current: Infinity },
	mouseY: { current: Infinity },
	magnification: 60,
	distance: 140,
	orientation: "horizontal",
	magnify: false,
});

/** The context `DockIcon` and `DockSeparator` read to find their dock. */
export function useDockContext(): DockContext {
	return inject(DOCK_CONTEXT_KEY, DOCK_FALLBACK);
}
