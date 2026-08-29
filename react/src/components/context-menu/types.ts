/**
 * The one contract this family publishes of its own, and the React context
 * that carries it.
 *
 * `MenuContext`/`MENU_KEY`/`SubContext`/`SUB_KEY` are NOT redefined here —
 * they are the exact same contract `DropdownMenuContent` and
 * `DropdownMenuSubContent` already implement, re-exported from
 * `dropdown-menu/types.ts` so both families' item-level components
 * (`*Item`, `*Separator`, `*Label`, `*Sub`, `*SubTrigger`, `*SubContent`)
 * share one implementation instead of two.
 *
 * The Svelte source publishes its own key as a `unique symbol`; React's
 * context object plays that role here, so the exported name is kept and the
 * value is a `React.Context` rather than a symbol — the same substitution
 * `dropdown-menu/types.ts` makes for `DROPDOWN_MENU_KEY`.
 */

import { createContext, useContext } from "react";
import type { Side, Align } from "../../internals/anchor-position.js";
import type { MenuCloseOptions } from "../dropdown-menu/types.js";

export { MENU_KEY, SUB_KEY } from "../dropdown-menu/types.js";
export type { MenuContext, MenuCloseOptions, SubContext } from "../dropdown-menu/types.js";

/** The contract between `ContextMenu` and its own `ContextMenuTrigger`/`ContextMenuContent`. */
export interface ContextMenuRootContext {
	readonly contentId: string;
	readonly side: Side;
	readonly align: Align;
	readonly offset: number;
	readonly loop: boolean;
	readonly open: boolean;
	/** The pointer coordinates the panel is anchored at — viewport-relative, matching `MouseEvent.clientX/clientY`. */
	readonly point: { x: number; y: number };
	/** The zero-size virtual anchor element `ContextMenuContent` positions itself against. */
	readonly anchorRef: HTMLElement | null;
	setAnchorRef(el: HTMLElement | null): void;
	/** Opens (or, if already open, repositions) the menu at `(x, y)`. */
	openAt(x: number, y: number): void;
	/** Closes the menu. Returns focus to whatever held it before the menu opened, by default. */
	close(options?: MenuCloseOptions): void;
}

export const CONTEXT_MENU_KEY = createContext<ContextMenuRootContext | undefined>(undefined);
CONTEXT_MENU_KEY.displayName = "ContextMenuRootContext";

/**
 * Reads the enclosing `ContextMenu`'s context.
 *
 * Both consumers below are only ever mounted by this folder's own root, so
 * there is no standalone-usage fallback to design for — the same assumption
 * each source sub-component makes. Internal; not exported from `index.ts`.
 */
export function useContextMenuRoot(): ContextMenuRootContext {
	const value = useContext(CONTEXT_MENU_KEY);
	if (value === undefined) {
		throw new Error(
			"ContextMenuRootContext is missing: this component must be rendered inside its provider."
		);
	}
	return value;
}
