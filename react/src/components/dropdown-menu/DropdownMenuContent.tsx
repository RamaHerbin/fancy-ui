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
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { createOpenSubRegistry, handleMenuContentKeydown } from "./menu-shared.js";
import { MENU_KEY, useDropdownMenuRoot } from "./types.js";
import type { MenuCloseOptions, MenuContext } from "./types.js";

export interface DropdownMenuContentProps {
	/** The `DropdownMenuItem`/`DropdownMenuSeparator`/`DropdownMenuLabel`/`DropdownMenuSub` children. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the panel. */
	className?: string;
}

/**
 * The portalled, anchored panel, and the level of menu-focus wiring its own
 * direct items register with.
 *
 * The source declares `ref = $bindable(null)`, so the panel element arrives
 * through the ref channel rather than a prop.
 */
export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
	function DropdownMenuContent({ children, className }, forwardedRef) {
		const root = useDropdownMenuRoot();

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
		// until `computePosition` flips or clamps it away from a viewport edge.
		// Seeded with the *requested* values by the hook itself, so the common
		// never-flipped case never shows a one-frame origin jump on open.
		const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
			anchor: () => root.triggerRef,
			side: root.side,
			align: root.align,
			offset: root.offset,
		});

		// `active: root.open` — a plain boolean where the source needed a
		// getter. The layer stays ON the stack for its whole exit and stops
		// being TOP of it the instant `open` flips, so a second Escape during
		// the fade is neither answered again nor swallowed on its way to
		// whatever sits underneath.
		useDismissable(panel, {
			onDismiss: () => root.close(),
			exclude: () => [root.triggerRef],
			active: root.open,
		});

		// Identity-stable for the life of the root, so this level's own context
		// is not rebuilt just because the root re-rendered.
		const closeRoot = root.close;
		const closeAll = useCallback(
			(options?: MenuCloseOptions) => {
				// Closing the root unmounts this whole subtree — every nested
				// `DropdownMenuSub`/`DropdownMenuSubContent` goes with it, so
				// there is nothing more for this level to do to close a
				// deeply-nested submenu's own state.
				closeRoot(options);
			},
			[closeRoot]
		);

		const menuContext = useMemo<MenuContext>(
			() => ({
				focus,
				itemTextClass: "text-[13px]",
				rootOpen: root.open,
				sound: root.sound,
				closeAll,
				registerOpenSub,
				closeSiblingSubs,
			}),
			[focus, root.open, root.sound, closeAll, registerOpenSub, closeSiblingSubs]
		);

		// Divergence D-9: the source waits a `tick()` here because its items
		// register from their own mount effect, which runs AFTER this
		// component's. React runs child effects before parent effects and
		// registration happens in each item's ref callback — earlier still —
		// so the items are already registered by the time this runs.
		//
		// Keyed on `presence.mounted` as well as `open`: `mounted` flips in
		// `usePresence`'s layout effect, one render after `open` does, and it
		// is that later commit which actually creates the items. `focusEdge`
		// is read through a live ref rather than listed as a dependency,
		// mirroring the source, where it is a plain `let` no effect tracks —
		// depending on it here would re-steal focus on every root re-render.
		const mounted = presence.mounted;
		const open = root.open;
		const focusEdgeRef = useLiveRef(root.focusEdge);
		useEffect(() => {
			if (!open || !mounted) return;
			focus.moveToEdge(focusEdgeRef.current);
		}, [open, mounted, focus, focusEdgeRef]);

		function handleKeydown(event: KeyboardEvent<HTMLDivElement>): void {
			// Only keys pressed inside THIS panel. A `DropdownMenuSubContent`
			// is portalled to `document.body` — a DOM sibling of this panel,
			// exactly as in the source — but it stays a React-tree DESCENDANT
			// of this element, and React propagates synthetic events through a
			// portal. Without this guard every ArrowDown/ArrowUp/Home/End and
			// every typeahead character pressed inside an open submenu would be
			// handled twice: once against that submenu's own focus core, then
			// again here, and this level's `.focus()` on one of its own items
			// would yank real DOM focus — the highlight this family renders off
			// — out of the submenu, leaving it unnavigable by keyboard. In the
			// source the two panels are native DOM siblings and the second
			// dispatch simply does not exist.
			if (!event.currentTarget.contains(event.target as Node)) return;
			handleMenuContentKeydown(event, menuContext, {
				// Tab is never `preventDefault`ed — the browser's own traversal is
				// what moves focus on, and it moves on from wherever focus SITS.
				// This panel is portalled to `document.body`, so the item holding
				// focus is a DOM sibling of the whole app: a Tab resuming from
				// there (or from `<body>`, once the panel is gone) walks straight
				// past every control that follows the trigger. Handing focus back
				// to the trigger synchronously, inside the keydown, is what gives
				// the default action the right starting point — forward to the
				// control after the trigger, backward to the one before it.
				//
				// Divergence from the Svelte source, which passes
				// `returnFocus: false` here and leaves the same gap.
				onTab: () => root.close(),
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

		// text-[13px]: this family's own density. Every item leaf inherits it
		// from here via normal CSS (they carry no font-size of their own); a
		// nested `DropdownMenuSubContent` gets it forwarded through
		// `menuContext.itemTextClass` instead, since a portalled submenu is a
		// DOM sibling of this panel once open, not a descendant.
		const classes = cn(
			"ft-dropdown-menu-content flex w-max min-w-[180px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-[13px] text-popover-foreground shadow-lg outline-none",
			className
		);

		// The `Portal` stays ABOVE the mounted gate, and the gate wraps its
		// CHILDREN. `usePortalTarget` resolves its container in a layout
		// effect, so a `Portal` that first mounts in the same commit as the
		// panel would render null on that pass — `usePresence` would then find
		// no registered leg and the entrance would be silently skipped.
		//
		// No focus trap: a dropdown menu is not modal. Tab is handled in
		// `handleKeydown` instead — it closes the menu and is never
		// `preventDefault`ed, so the browser's own Tab traversal continues from
		// wherever real DOM focus currently sits. That also means this panel
		// needs no eager focus-return handle the way a modal surface does:
		// `DropdownMenu`'s own `setOpen` refocuses the trigger from a plain
		// function outside this gate, so the return already lands at the
		// dismiss instant rather than at unmount.
		//
		// `data-state` is an ordinary attribute (divergence D-2) carrying
		// `surfaceState`'s TWO values — never `"opening"` (convention C-5).
		// `inert` is not written by hand either: `usePresence` sets it on every
		// registered node for the whole exit, which is what keeps a menu on its
		// way out from answering a click.
		return (
			<Portal>
				<MENU_KEY.Provider value={menuContext}>
					{presence.mounted ? (
						<div
							ref={panelRef}
							id={root.contentId}
							role="menu"
							aria-labelledby={root.triggerId}
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

DropdownMenuContent.displayName = "DropdownMenuContent";
