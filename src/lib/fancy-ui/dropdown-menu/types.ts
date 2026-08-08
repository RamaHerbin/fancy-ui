import type { MenuFocusState } from "../_internals/menu.svelte.js";
import type { Side, Align } from "../_internals/anchor-position.js";

/**
 * Shared by `DropdownMenu` and `ContextMenu`'s content panels for their
 * item-level children — `*Item`, `*Separator`, `*Label`, `*Sub`,
 * `*SubTrigger`, `*SubContent`. Defined once here (not in `_internals/`,
 * which is frozen) and imported by `context-menu/types.ts`, because the two
 * families behave identically once a panel is open — same menu-focus
 * wiring, same submenu intent-delay behaviour — and only how the panel
 * itself opens and where it anchors differs. See each folder's README,
 * "Shared implementation", for exactly what that covers.
 *
 * Both a top-level `*Content` and a nested `*SubContent` provide one of
 * these under `MENU_KEY` — a `*SubContent` shadows its parent's for its own
 * subtree, so `*Item`/`*Separator`/`*Label` never need to know which level
 * they are at.
 */
export interface MenuContext {
	/** The menu-focus core for this level's own items — not a nested submenu's, which has its own. */
	readonly focus: MenuFocusState;
	/**
	 * The Tailwind font-size class items at this level should render at —
	 * `"text-[13px]"` under `DropdownMenu`, `"text-[12px]"` under
	 * `ContextMenu`. `*Item`/`*SubTrigger` set no font-size of their own and
	 * simply inherit it via normal CSS from whichever panel renders them —
	 * this field only exists for `*SubContent` to read and pass through.
	 * A `*SubContent` is portalled to `document.body` independently of its
	 * parent panel (also portalled there), so the two end up as DOM
	 * *siblings* once open, not ancestor/descendant — CSS inheritance from
	 * the root panel to a nested submenu's own items doesn't reach across
	 * that gap the way it does from a panel straight to its own direct
	 * items. Svelte context isn't DOM-based, though: it follows the
	 * *component* tree, which portalling a node doesn't change, so this
	 * field crosses the same gap CSS can't.
	 */
	readonly itemTextClass: string;
	/** Closes the whole menu, root included. What selecting an item and pressing Tab both do. */
	closeAll(options?: { returnFocus?: boolean }): void;
	/** Registers a currently-open submenu at this level, keyed by its trigger element. Returns an unregister function. */
	registerOpenSub(triggerEl: HTMLElement, close: () => void): () => void;
	/** Closes every open submenu at this level except the one whose trigger is `exceptTriggerEl` — only one submenu open per level, like a native menu bar. */
	closeSiblingSubs(exceptTriggerEl: HTMLElement): void;
}
export const MENU_KEY: unique symbol = Symbol("menu-context");

/**
 * The contract between a `*Sub` boundary and its own `*SubTrigger` and
 * `*SubContent` — distinct from `MenuContext`, which is about a level's
 * *items*, not the one boundary component coordinating a single submenu's
 * open state and hover-intent timers.
 */
export interface SubContext {
	readonly open: boolean;
	readonly contentId: string;
	readonly triggerRef: HTMLElement | null;
	/**
	 * The side the submenu actually rendered on, as last reported by
	 * `anchorPosition`'s `onPlacement` — `"right"` until a flip moves it to
	 * `"left"`. `SubTrigger` reads this to mirror its caret; ArrowRight/Left
	 * keep their fixed meaning ("into the submenu" / "back to the trigger")
	 * regardless of which side that visually is.
	 */
	readonly resolvedSide: Side;
	setTriggerRef(el: HTMLElement | null): void;
	setResolvedSide(side: Side): void;
	/** Opens the submenu. Idempotent — does nothing if already open. */
	openSub(): void;
	/** Closes the submenu, optionally returning DOM focus to its trigger. */
	closeSub(returnFocus: boolean): void;
	/** Cancels a pending close-intent timer. Called when the pointer enters the trigger or the content. */
	keepOpen(): void;
	/** Starts the close-intent timer. Called when the pointer leaves the trigger or the content. */
	scheduleClose(): void;
}
export const SUB_KEY: unique symbol = Symbol("menu-sub-context");

/** The contract between `DropdownMenu` and its own `DropdownMenuTrigger`/`DropdownMenuContent`. */
export interface DropdownMenuRootContext {
	readonly contentId: string;
	readonly triggerId: string;
	readonly side: Side;
	readonly align: Align;
	readonly offset: number;
	readonly loop: boolean;
	readonly open: boolean;
	/** Which end to focus once the content mounts — set by whichever key opened the trigger. */
	readonly focusEdge: "first" | "last";
	readonly triggerRef: HTMLElement | null;
	setTriggerRef(el: HTMLElement | null): void;
	/** Opens the menu (if not already open) and requests that its content focus `edge` once mounted. */
	openWithFocus(edge: "first" | "last"): void;
	/** Closes the menu. Returns focus to the trigger by default. */
	close(options?: { returnFocus?: boolean }): void;
}
export const DROPDOWN_MENU_KEY: unique symbol = Symbol("dropdown-menu-root-context");
