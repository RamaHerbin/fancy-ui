import { forwardRef, useCallback, useEffect, useMemo } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useMenuFocus } from "../../internals/menu.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useConstant } from "../../internals/dom/ssr.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { createOpenSubRegistry, handleMenuContentKeydown } from "../dropdown-menu/menu-shared.js";
import { MENU_KEY } from "../dropdown-menu/types.js";
import type { MenuCloseOptions, MenuContext } from "../dropdown-menu/types.js";
import { useContextMenuRoot } from "./types.js";

export interface ContextMenuContentProps {
	/** The `ContextMenuItem`/`ContextMenuSeparator`/`ContextMenuLabel`/`ContextMenuSub` children. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the panel. */
	className?: string;
}

/**
 * The portalled, anchored panel, and the level of menu-focus wiring its own
 * direct items register with.
 *
 * Self-gated on the root's `open`, same reasoning as `DropdownMenuContent`.
 * Not modal: no focus trap, no scroll lock. Positioned against a *virtual*
 * anchor — `ContextMenu`'s own zero-size anchor span, moved to the last
 * right-click's coordinates — instead of a real trigger element, but the
 * positioning core's flip/clamp behaviour needs nothing different for that: a
 * zero-size `DOMRect` at the pointer flips and clamps at the viewport edges
 * exactly the same way a real element's rect does — and the growth origin
 * follows that same resolved side, so a menu that flipped to sit *above* a
 * click near the bottom of the viewport grows out of its own bottom edge, the
 * one still touching the pointer, instead of its top. The exit collapses back
 * into that same corner.
 *
 * The source declares `ref = $bindable(null)`, so the panel element arrives
 * through the ref channel rather than a prop.
 */
export const ContextMenuContent = forwardRef<HTMLDivElement, ContextMenuContentProps>(
	function ContextMenuContent({ children, className }, forwardedRef) {
		const root = useContextMenuRoot();

		// The NODE, not a ref (convention C-1): the panel is created by
		// `presence.mounted`, so a `useRef` read inside a `[]`-deps effect
		// would still be null when the position and dismiss effects fire.
		const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

		// `loop` as a PLAIN VALUE: the hook hands the core a getter over a live
		// ref, so `move()` reads `root.loop` fresh on every call exactly as the
		// source's `get loop()` did.
		const focus = useMenuFocus({ loop: root.loop });

		const registry = useConstant(createOpenSubRegistry);
		const { registerOpenSub, closeSiblingSubs } = registry;

		const presence = usePresence(root.open);

		// The placement as ACTUALLY resolved — the requested side and align
		// until the positioning core flips or clamps it away from a viewport
		// edge. Seeded with the *requested* values by the hook itself, so an
		// un-flipped open never depends on a placement callback having fired
		// first. This is the panel where a flip is routine rather than
		// exceptional: the anchor is a point at the pointer, and a right-click
		// anywhere in the lower or right band of the viewport flips it. Growing
		// from the corner nearest that point is what keeps the menu feeling
		// attached to the click instead of erupting from its own middle. The
		// cross-axis alignment differs from the requested one whenever clamping
		// slid the panel along that axis — near a viewport edge the requested
		// corner is no longer the one touching the anchor, and an entrance grown
		// from it would expand from the far corner instead.
		const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
			anchor: () => root.anchorRef,
			side: root.side,
			align: root.align,
			offset: root.offset,
		});

		// `active: root.open` — a plain boolean where the source needed a
		// getter. The layer stays ON the stack for its whole exit and stops
		// being TOP of it the instant `open` flips, so a second Escape during
		// the fade is neither answered again nor swallowed on its way to
		// whatever sits underneath. No `exclude`: unlike a dropdown's button,
		// this family's trigger is a whole region and the source excludes
		// nothing from the outside-click test.
		useDismissable(panel, {
			onDismiss: () => root.close(),
			active: root.open,
		});

		// Identity-stable for the life of the root, so this level's own context
		// is not rebuilt just because the root re-rendered.
		const closeRoot = root.close;
		const closeAll = useCallback(
			(options?: MenuCloseOptions) => {
				// Closing the root unmounts this whole subtree — every nested
				// `ContextMenuSub`/`ContextMenuSubContent` goes with it, so
				// there is nothing more for this level to do to close a
				// deeply-nested submenu's own state.
				closeRoot(options);
			},
			[closeRoot]
		);

		// text-[12px]: this family's own density, distinct from DropdownMenu's
		// 13px — the mockup specifies both explicitly. Every shared item leaf
		// inherits this from the panel below via normal CSS (they carry no
		// font-size of their own); a nested `ContextMenuSubContent` gets it
		// forwarded through `menuContext.itemTextClass` instead, since a
		// portalled submenu is a DOM sibling of this panel once open, not a
		// descendant, and can't inherit it directly.
		const menuContext = useMemo<MenuContext>(
			() => ({
				focus,
				itemTextClass: "text-[12px]",
				rootOpen: root.open,
				closeAll,
				registerOpenSub,
				closeSiblingSubs,
			}),
			[focus, root.open, closeAll, registerOpenSub, closeSiblingSubs]
		);

		// The source waits a `tick()` here because its items register from
		// their own mount effect, which runs AFTER this component's. React runs
		// child effects before parent effects and registration happens in each
		// item's ref callback — earlier still — so the items are already
		// registered by the time this runs.
		//
		// Keyed on `presence.mounted` as well as `open`: `mounted` flips in
		// `usePresence`'s layout effect, one render after `open` does, and it
		// is that later commit which actually creates the items.
		const mounted = presence.mounted;
		const open = root.open;
		useEffect(() => {
			if (!open || !mounted) return;
			focus.moveToEdge("first");
		}, [open, mounted, focus]);

		function handleKeydown(event: KeyboardEvent<HTMLDivElement>): void {
			// Only keys pressed inside THIS panel. A `ContextMenuSubContent` is
			// portalled to `document.body` — a DOM sibling of this panel,
			// exactly as in the source — but it stays a React-tree DESCENDANT
			// of this element, and React propagates synthetic events through a
			// portal. Without this guard every ArrowDown/ArrowUp/Home/End and
			// every typeahead character pressed inside an open submenu would be
			// handled twice. In the source the two panels are native DOM
			// siblings and the second dispatch simply does not exist.
			if (!event.currentTarget.contains(event.target as Node)) return;
			handleMenuContentKeydown(event, menuContext, {
				onTab: () => root.close({ returnFocus: false }),
			});
		}

		// Convention C-2: composed ABOVE the conditional below. Calling this
		// inside the JSX branch would be a conditional hook and would throw the
		// first time `mounted` flips.
		//
		// ONE bidirectional transition, never a split in/out pair: the
		// in-flight counterpart's current position is passed into the fresh
		// leg, so a menu reopened mid-exit continues from where it is instead
		// of snapping to invisible first. `entering` is what tells it which way
		// it is going, and the params are read at the instant each leg starts.
		const panelRef = useComposedRefs(
			setPanelNode,
			forwardedRef,
			presence.register(anchored, (entering) => ({ side: resolvedSide, entering }))
		);

		const classes = cn(
			"ft-context-menu-content flex w-max min-w-[180px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-[12px] text-popover-foreground shadow-lg outline-none",
			className
		);

		// The `Portal` stays ABOVE the mounted gate, and the gate wraps its
		// CHILDREN. `usePortalTarget` resolves its container in a layout
		// effect, so a `Portal` that first mounts in the same commit as the
		// panel would render null on that pass — `usePresence` would then find
		// no registered leg and the entrance would be silently skipped.
		//
		// Focus needs nothing here: `ContextMenu`'s own `setOpen` returns focus
		// to whatever was focused before the right-click, from a plain function
		// outside this gate, so the return still happens at the dismiss instant
		// rather than waiting out the fade. `data-state` carries
		// `surfaceState`'s TWO values — never `"opening"` (convention C-5) —
		// and `inert` is not written by hand either: `usePresence` sets it on
		// every registered node for the whole exit, which is what keeps a menu
		// on its way out from answering a click.
		return (
			<Portal>
				<MENU_KEY.Provider value={menuContext}>
					{presence.mounted ? (
						<div
							ref={panelRef}
							id={root.contentId}
							role="menu"
							tabIndex={-1}
							className={classes}
							data-state={presence.surfaceState}
							data-side={resolvedSide}
							data-align={root.align}
							style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
							onKeyDown={handleKeydown}
						>
							{children}
						</div>
					) : null}
				</MENU_KEY.Provider>
			</Portal>
		);
	}
);

ContextMenuContent.displayName = "ContextMenuContent";
