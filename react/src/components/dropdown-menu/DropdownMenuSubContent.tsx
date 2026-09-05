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
import { createOpenSubRegistry, handleMenuContentKeydown } from "./menu-shared.js";
import { MENU_KEY, useMenuContext, useSubContext } from "./types.js";
import type { MenuCloseOptions, MenuContext } from "./types.js";

export interface DropdownMenuSubContentProps {
	/** The `DropdownMenuItem`/`DropdownMenuSeparator`/`DropdownMenuLabel`/nested `DropdownMenuSub` children. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * A submenu's own portalled, anchored panel, and the level of menu-focus
 * wiring its own direct items register with.
 *
 * The source declares `ref = $bindable(null)`, so the panel element arrives
 * through the ref channel rather than a prop.
 */
export const DropdownMenuSubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
	function DropdownMenuSubContent({ children, className }, forwardedRef) {
		// Captured before the provider below shadows it for this subtree —
		// `menuContext.closeAll` delegates straight to this, so a selection
		// three submenus deep still closes the whole tree in one hop.
		const parentMenu = useMenuContext();
		const sub = useSubContext();

		// `sub.open` alone is not liveness. Closing the root — selecting a root
		// item, or an external `open` write — flips only the root's state and
		// tears this subtree down with it, leaving `sub.open` true for the
		// whole global outro. Everything that has to know whether this panel is
		// a live top layer reads THIS instead: the presence clock, which would
		// otherwise run the entrance curve on the way out, and the dismissable
		// layer, which would otherwise let a fading submenu swallow an Escape
		// or an outside click that belongs to whatever is underneath.
		//
		// `parentMenu.rootOpen` rather than the family's own root context: this
		// level reads the contract every menu family implements, and
		// republishing `live` as this level's own `rootOpen` below is what
		// makes the answer compose down a chain of nested submenus.
		const live = sub.open && parentMenu.rootOpen;

		const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

		const focus = useMenuFocus();
		const registry = useConstant(createOpenSubRegistry);
		const { registerOpenSub, closeSiblingSubs } = registry;

		const presence = usePresence(live);

		// `align` is the literal `"start"`, and `side` the literal `"right"` —
		// a submenu never asks for any other placement. The resolved pair goes
		// back onto the sub context rather than into local state: it already
		// drives `DropdownMenuSubTrigger`'s caret glyph, and a second copy here
		// would give the caret and the growth origin two sources of truth that
		// could disagree after a flip.
		const setPlacement = sub.setPlacement;
		useAnchorPosition(panel, {
			anchor: () => sub.triggerRef,
			side: "right",
			align: "start",
			offset: 2,
			onPlacement: (side, align) => setPlacement(side, align),
		});

		// Its own layer: Escape and an outside click close only THIS submenu
		// (returning focus to its trigger), not the root, one interaction at a
		// time.
		useDismissable(panel, {
			onDismiss: () => sub.closeSub(true),
			exclude: () => [sub.triggerRef],
			active: live,
		});

		const parentCloseAll = parentMenu.closeAll;
		const closeAll = useCallback(
			(options?: MenuCloseOptions) => {
				parentCloseAll(options);
			},
			[parentCloseAll]
		);

		const menuContext = useMemo<MenuContext>(
			() => ({
				focus,
				// Forwarded, not re-decided: this level's own density is whatever
				// the level above it already resolved, all the way down. It has to
				// travel through context rather than plain CSS inheritance because
				// a portalled submenu is a DOM sibling of its parent panel, not a
				// descendant.
				itemTextClass: parentMenu.itemTextClass,
				// This level's own liveness, not the root's raw state: a submenu
				// nested inside THIS one is no more alive than this one is.
				rootOpen: live,
				// Copied from the parent level for the same reason as
				// `itemTextClass`: a submenu's own sound behaviour follows whatever
				// the root resolved, all the way down through nested submenus.
				sound: parentMenu.sound,
				closeAll,
				registerOpenSub,
				closeSiblingSubs,
			}),
			[
				focus,
				parentMenu.itemTextClass,
				parentMenu.sound,
				live,
				closeAll,
				registerOpenSub,
				closeSiblingSubs,
			]
		);

		// Divergence D-9, exactly as in `DropdownMenuContent`: no `tick()` wait
		// before moving to an edge, because items register in their own ref
		// callbacks, which land in the commit that creates them.
		const mounted = presence.mounted;
		const subOpen = sub.open;
		useEffect(() => {
			if (!subOpen || !mounted) return;
			focus.moveToEdge("first");
		}, [subOpen, mounted, focus]);

		function handleKeydown(event: KeyboardEvent<HTMLDivElement>): void {
			// The same guard `DropdownMenuContent` carries, and here for the
			// same reason one level further down: a submenu nested inside this
			// one is portalled away but is still a React-tree descendant of
			// this element, so without it a single ArrowLeft would close two
			// levels at once and one arrow key would move two focus cores.
			//
			// A guard rather than `event.stopPropagation()`: React's synthetic
			// `stopPropagation` also stops the NATIVE event, which — because
			// React listens on the portal container — is only as far as
			// `document.body` when the handler runs. `dismissable` listens on
			// `document`, so stopping it there would silently cost this panel
			// its Escape and its outside-click dismissal.
			if (!event.currentTarget.contains(event.target as Node)) return;
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				sub.closeSub(true);
				return;
			}
			handleMenuContentKeydown(event, menuContext, {
				// Tab closes the *whole* tree, not just this level — the browser's
				// own Tab traversal should leave the entire menu system behind, the
				// same as it does from the root content, and resume from the root
				// trigger for the same reason it does there (both panels are
				// portalled to `document.body`). `closeAll` forwards to the root's
				// own `close`, so the default `returnFocus` lands on the trigger.
				onTab: () => parentMenu.closeAll(),
			});
		}

		function handleMouseEnter(): void {
			sub.keepOpen();
		}

		function handleMouseLeave(): void {
			sub.scheduleClose();
		}

		// Convention C-2: composed ABOVE the conditional below. ONE
		// bidirectional transition with `entering: live`, exactly as
		// `DropdownMenuContent` does and for the same reasons.
		//
		// The source spells this transition `|global` so that closing the ROOT
		// collects this panel's exit too, instead of letting it pop out of
		// existence at full opacity beside a parent already fading. React needs
		// no equivalent: `live` already folds the root's state in, so this
		// panel's own clock starts its exit in the very commit the root's does
		// and both levels fade together.
		const panelRef = useComposedRefs(
			setPanelNode,
			forwardedRef,
			presence.register(anchored, (entering) => ({ side: sub.resolvedSide, entering }))
		);

		// No fixed font-size in the string below — `parentMenu.itemTextClass`
		// is spliced in instead, since this panel is portalled to
		// `document.body` independently of its own parent panel and can't
		// inherit that parent's size via plain CSS once both are open.
		const classes = cn(
			"ft-dropdown-menu-content flex w-max min-w-[160px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-popover-foreground shadow-lg outline-none",
			parentMenu.itemTextClass,
			className
		);

		// The `Portal` stays ABOVE the mounted gate for the same reason it does
		// in `DropdownMenuContent`: a `Portal` first mounting in the same commit
		// as the panel renders null on that pass, and the entrance would be
		// silently skipped.
		return (
			<Portal>
				<MENU_KEY.Provider value={menuContext}>
					{presence.mounted ? (
						<div
							ref={panelRef}
							id={sub.contentId}
							role="menu"
							aria-labelledby={sub.triggerId}
							tabIndex={-1}
							className={classes}
							data-state={presence.surfaceState}
							data-side={sub.resolvedSide}
							data-align="start"
							style={{ transformOrigin: originFor(sub.resolvedSide, sub.resolvedAlign) }}
							onKeyDown={handleKeydown}
							onMouseEnter={handleMouseEnter}
							onMouseLeave={handleMouseLeave}
						>
							{children}
						</div>
					) : null}
				</MENU_KEY.Provider>
			</Portal>
		);
	}
);

DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
