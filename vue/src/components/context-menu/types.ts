import { createInternalContext, type InternalContext } from "../../internals/dom/context.js";
import type { Side, Align } from "../../internals/anchor-position.js";

// `MenuContext`/`SUB_KEY`/`SubContext` are NOT redefined here — they are the
// exact same contract `DropdownMenuContent` and `DropdownMenuSubContent`
// already implement, imported from `dropdown-menu/types.ts` so both
// families' item-level components (`*Item`, `*Separator`, `*Label`, `*Sub`,
// `*SubTrigger`, `*SubContent`) share one implementation instead of two. See
// README.md, "Shared implementation".
export { MENU_KEY, SUB_KEY } from "../dropdown-menu/types.js";
export type { MenuContext, SubContext } from "../dropdown-menu/types.js";
import type { MenuCloseOptions } from "../dropdown-menu/types.js";
export type { MenuCloseOptions };

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
	/** Whether this menu plays sound cues — mirrors `ContextMenuProps.sound`. */
	readonly sound: boolean;
	setAnchorRef(el: HTMLElement | null): void;
	/** Opens (or, if already open, repositions) the menu at `(x, y)`. */
	openAt(x: number, y: number): void;
	/** Closes the menu. Returns focus to whatever held it before the menu opened, by default. */
	close(options?: MenuCloseOptions): void;
}

// The source publishes this as a `unique symbol` context key; here it is the
// package's own typed-key-plus-bindings helper (convention C-3), so the
// exported name is kept and a consumer reads it with
// `CONTEXT_MENU_KEY.useRequired()` — a named error outside its provider
// rather than `undefined`. The underlying `InjectionKey` is
// `CONTEXT_MENU_KEY.key`.
export const CONTEXT_MENU_KEY: InternalContext<ContextMenuRootContext> =
	createInternalContext<ContextMenuRootContext>("ContextMenuRootContext");
