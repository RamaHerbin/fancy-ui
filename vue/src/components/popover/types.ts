import type { InjectionKey } from "vue";

import { createInternalContext, type InternalContext } from "../../internals/dom/context.js";
import type { Side, Align } from "../../internals/anchor-position.js";

/**
 * The contract between the `Popover` root and its portalled content panel.
 *
 * The root owns everything that decides *whether* and *where* the panel
 * renders — the open flag, the trigger element to anchor against, and the
 * positioning/dismiss knobs the caller passed in. The content panel only
 * ever reads this; it never sets `open` itself (it closes through `close()`,
 * which routes back through the root so `onOpenChange` still fires).
 */
export interface PopoverContext {
	/** The panel's own id — also what the trigger's `aria-controls` points at. */
	readonly contentId: string;
	/** Side of the trigger to place the panel on. */
	readonly side: Side;
	/** Alignment along the trigger's cross axis. */
	readonly align: Align;
	/** Gap in pixels between the trigger and the panel. */
	readonly offset: number;
	/** Whether Escape and an outside click are allowed to close the panel. */
	readonly dismissible: boolean;
	/** The real trigger button, once mounted — what the panel anchors against. */
	readonly triggerRef: HTMLElement | null;
	/**
	 * Whether the panel is open. Read by the panel's own presence clock to
	 * tell an entrance from a departure — one bidirectional leg cannot work
	 * that out on its own — and by the dismiss layer's `active` gate, so a
	 * panel that is already fading stops answering Escape and stops counting
	 * as the top layer.
	 *
	 * A getter rather than a value copied into the context once, exactly as
	 * the source declares it: the mount gate lives one level DOWN from the
	 * source's `{#if open}`, inside the panel itself, so `open` has to arrive
	 * through the context at all, and it must still read true/false correctly
	 * for the whole length of the exit.
	 *
	 * The panel still never *writes* this: it closes through `close()`, which
	 * routes back through the root so `onOpenChange` fires exactly once.
	 */
	readonly open: boolean;
	/** Closes the panel, going through the root's own `open` state so `onOpenChange` fires. */
	close(): void;
}

/**
 * The context plus its bindings. `PopoverContent` reads it with
 * `useRequired()` and gets a named error rather than `undefined` if it is
 * ever rendered outside a `Popover` — the source's own content component
 * makes the same assumption about its root, without the diagnostic.
 *
 * Internal: `index.ts` publishes the key below instead, which is what the
 * source's own barrel exports.
 */
export const POPOVER_CONTEXT: InternalContext<PopoverContext> =
	createInternalContext<PopoverContext>("PopoverContext");

/**
 * The same context key the source publishes, now carrying the value type so
 * `inject` is checked. The public escape hatch for a consumer composing their
 * own panel content:
 *
 * ```ts
 * const popover = inject(POPOVER_KEY, undefined);
 * ```
 */
export const POPOVER_KEY: InjectionKey<PopoverContext> = POPOVER_CONTEXT.key;
