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
/**
 * Options accepted by a menu's own `close`/`closeAll`, shared across every
 * level (root, item, sub) so one call site's options object works
 * everywhere it's forwarded to.
 */
export interface MenuCloseOptions {
	/** Whether closing returns DOM focus to the trigger. Defaults to `true` wherever it's read. */
	returnFocus?: boolean;
	/**
	 * Suppresses the `close` sound cue for this particular close call —
	 * used when the caller is about to play its own cue instead (an item's
	 * `select`), so exactly one cue fires per interaction, never both.
	 * Has no effect when the root's own `sound` prop is off.
	 */
	silent?: boolean;
}

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
	/**
	 * Whether this menu family plays sound cues — forwarded from the root's
	 * own `sound` prop by `DropdownMenu` and by `ContextMenuContent`.
	 * Optional so a part rendered outside either root reads falsy, which is
	 * the correct "no sound" answer there.
	 */
	readonly sound?: boolean;
	/**
	 * Whether the menu TREE this level belongs to is still open — not just
	 * this level's own `{#if}`. Closing the root flips only the root's state
	 * and tears every nested level down with it, so a submenu's own
	 * `sub.open` stays true for the whole of that outro. Anything asking "is
	 * this panel a live top layer?" — an exit transition picking its curve,
	 * a `dismissable` deciding whether an Escape is its to swallow — has to
	 * read this instead. A `*SubContent` republishes it as its own liveness,
	 * so the answer composes down a chain of nested submenus.
	 */
	readonly rootOpen: boolean;
	/** Closes the whole menu, root included. What selecting an item and pressing Tab both do. */
	closeAll(options?: MenuCloseOptions): void;
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
	/** The sub-trigger's own id — read by `SubContent` for `aria-labelledby`, so the submenu panel announces the row that opened it. */
	readonly triggerId: string;
	readonly triggerRef: HTMLElement | null;
	/**
	 * The side the submenu actually rendered on, as last reported by
	 * `anchorPosition`'s `onPlacement` — `"right"` until a flip moves it to
	 * `"left"`. `SubTrigger` reads this to mirror its caret; ArrowRight/Left
	 * keep their fixed meaning ("into the submenu" / "back to the trigger")
	 * regardless of which side that visually is.
	 */
	readonly resolvedSide: Side;
	/**
	 * The cross-axis alignment the submenu actually rendered with, as last
	 * reported by `onPlacement`. `"start"` until a clamp near a viewport edge
	 * slides the panel along that axis, after which the requested corner is
	 * no longer the one touching the trigger. `SubContent` reads this for its
	 * entrance origin, so the panel grows from the corner nearest the trigger
	 * rather than from the far one.
	 */
	readonly resolvedAlign: Align;
	setTriggerRef(el: HTMLElement | null): void;
	setPlacement(side: Side, align: Align): void;
	/** Opens the submenu. Idempotent — does nothing if already open. */
	openSub(): void;
	/** Closes the submenu, optionally returning DOM focus to its trigger. */
	/** `silent` suppresses the submenu's `close` cue (parent-driven closes). */
	closeSub(returnFocus: boolean, silent?: boolean): void;
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
	/** Whether this menu plays sound cues — mirrors `DropdownMenuProps.sound`. */
	readonly sound: boolean;
	setTriggerRef(el: HTMLElement | null): void;
	/** Opens the menu (if not already open) and requests that its content focus `edge` once mounted. */
	openWithFocus(edge: "first" | "last"): void;
	/** Closes the menu. Returns focus to the trigger by default. */
	close(options?: MenuCloseOptions): void;
}
export const DROPDOWN_MENU_KEY: unique symbol = Symbol("dropdown-menu-root-context");
