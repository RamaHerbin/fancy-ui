import type { Side, Align } from "../_internals/anchor-position.js";

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
	/** Closes the panel, going through the root's own `open` state so `onOpenChange` fires. */
	close(): void;
}

export const POPOVER_KEY: unique symbol = Symbol("popover-context");
