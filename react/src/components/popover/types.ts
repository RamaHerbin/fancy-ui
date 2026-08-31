/**
 * The contract between the `Popover` root and its portalled content panel,
 * and the React context that carries it.
 *
 * The source publishes this contract under a `unique symbol` context key;
 * React's own context object plays that role here, so the exported name is
 * kept and the value is a `React.Context` object rather than a symbol — the
 * same substitution the menu family makes for `MENU_KEY`:
 *
 * ```tsx
 * const popover = useContext(POPOVER_KEY);
 * ```
 */

import { createContext, useContext } from "react";
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
	 * tell an entrance from a departure, and by `useDismissable`'s `active`
	 * gate, so a panel that is already fading stops answering Escape and
	 * stops counting as the top layer.
	 *
	 * A plain boolean where the source needed a getter (divergence D-6):
	 * React re-renders the still-mounted exiting panel normally, so every
	 * reader sees the current value without a getter having to defeat an
	 * inert-effect scheduler.
	 *
	 * The panel still never *writes* this: it closes through `close()`, which
	 * routes back through the root so `onOpenChange` fires exactly once.
	 */
	readonly open: boolean;
	/** Closes the panel, going through the root's own `open` state so `onOpenChange` fires. */
	close(): void;
}

export const POPOVER_KEY = createContext<PopoverContext | undefined>(undefined);
POPOVER_KEY.displayName = "PopoverContext";

/**
 * Reads the enclosing `Popover`'s context.
 *
 * `Popover` only ever mounts `PopoverContent` under its own provider, so
 * there is no standalone-usage fallback to design for — the same assumption
 * the source's own content component makes about its root. Internal: not
 * exported from `index.ts`.
 */
export function usePopoverContext(): PopoverContext {
	const value = useContext(POPOVER_KEY);
	if (value === undefined) {
		throw new Error(
			"PopoverContext is missing: this component must be rendered inside its provider."
		);
	}
	return value;
}
