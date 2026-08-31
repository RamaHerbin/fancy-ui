import { createContext } from "react";

/**
 * The contract between the stepper root and its steps.
 *
 * `Stepper` owns the active index; every `Step` reads it through
 * context instead of a prop threaded down by hand, the same
 * "root owns the shared state, items read it" shape a toggle group and
 * its items use for roving focus.
 *
 * A step's own number and status (done/current/upcoming) are derived from
 * its position among its registered siblings, not from any prop the
 * consumer supplies. Registration order is trusted as step order here —
 * unlike the live-DOM-position re-query `menu.ts` does for arrow-key
 * navigation, steps are a static composition (typically one `map` over a
 * fixed list) that doesn't reorder after mount, so the order each `Step`
 * registers in in its own mount effect already *is* DOM order. React runs
 * child effects before parent effects and in mount order, so siblings
 * register top-to-bottom exactly as they do on the Svelte side.
 *
 * That assumption has a consequence, not just a precondition: reordering
 * already-mounted `Step`s (a keyed list that moves an existing item rather
 * than adding or removing one) does not re-run that item's registration
 * effect, so `indexOf` keeps returning its *original* mount position —
 * reordering without add or remove leaves every step's number, status,
 * checkmark and `aria-current` pinned to its original mount position.
 * Adding or removing a step settles correctly, since that's a genuine
 * mount/unmount. Only pure reordering is affected.
 */
export interface StepperContext {
	/** The rail's stacking axis. */
	readonly orientation: "horizontal" | "vertical";
	/** Whether steps render as buttons a reader can click to jump. */
	readonly clickable: boolean;
	/** The active step's 0-based index. */
	readonly current: number;
	/** Total number of currently registered steps. */
	readonly count: number;
	/**
	 * Registers a step under a stable per-instance id (typically
	 * `useFancyId()`). Returns an unregister function; call it on unmount.
	 *
	 * Identity-stable for the life of the root, on purpose: a `Step`'s
	 * registration effect depends on this function, and a function rebuilt
	 * on every context change would re-run that effect — unregister,
	 * register, re-render, unregister — forever. See `Stepper.tsx`.
	 */
	register(id: string): () => void;
	/** `id`'s 0-based position among registered steps, or -1 before it has registered. */
	indexOf(id: string): number;
	/** Jumps to `index`, if `clickable`. No-op otherwise. */
	select(index: number): void;
}

/**
 * The context a `Step` reads to learn its position, its status and the
 * rail's shape. The Svelte source publishes it under a `Symbol` context
 * key; React's own context object plays that role here, so the exported
 * name is kept and the value is a `React.Context` rather than a symbol:
 *
 * ```tsx
 * const stepper = useContext(STEPPER_KEY);
 * ```
 *
 * Read it as optional — a `Step` rendered outside a `Stepper` gets
 * `undefined` rather than throwing, and renders as a plain, always
 * "upcoming", never-clickable item.
 */
export const STEPPER_KEY = createContext<StepperContext | undefined>(undefined);
STEPPER_KEY.displayName = "StepperContext";
