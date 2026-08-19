/**
 * The contract between the stepper root and its steps.
 *
 * `Stepper` owns the active index; every `Step` reads it through
 * `getContext` instead of a prop threaded down by hand, the same
 * "root owns the shared state, items read it" shape `ToggleGroup` /
 * `ToggleGroupItem` use for roving focus.
 *
 * A step's own number and status (done/current/upcoming) are derived from
 * its position among its registered siblings, not from any prop the
 * consumer supplies. Registration order is trusted as step order here —
 * unlike the live-DOM-position re-query `menu.svelte.ts` does for arrow-key
 * navigation, steps are a static composition (typically one `{#each}` over
 * a fixed list) that doesn't reorder after mount, so the order each `Step`
 * registers in in its own mount effect already *is* DOM order.
 *
 * That assumption has a consequence, not just a precondition: reordering
 * already-mounted `Step`s (a keyed `{#each}` that moves an existing item
 * rather than adding or removing one) does not re-run that item's
 * registration effect, so `indexOf` keeps returning its *original* mount
 * position — reordering without add or remove leaves every step's number,
 * status, checkmark and `aria-current` pinned to its original mount
 * position. Adding or removing a step settles correctly, since that's a
 * genuine mount/unmount. Only pure reordering is affected.
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
	 * `$props.id()`). Returns an unregister function; call it on destroy.
	 */
	register(id: string): () => void;
	/** `id`'s 0-based position among registered steps, or -1 before it has registered. */
	indexOf(id: string): number;
	/** Jumps to `index`, if `clickable`. No-op otherwise. */
	select(index: number): void;
}

export const STEPPER_KEY: unique symbol = Symbol("stepper-context");
