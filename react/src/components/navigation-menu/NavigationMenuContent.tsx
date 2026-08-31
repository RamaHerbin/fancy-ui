import { forwardRef } from "react";
import type { FocusEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { useNavigationMenuContext, useNavigationMenuItemContext } from "./types.js";
import "./navigation-menu-content.css";

export interface NavigationMenuContentProps {
	/** The panel's content — typically a feature tile plus a stack of `NavigationMenuLink`s. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

export const NavigationMenuContent = forwardRef<HTMLDivElement, NavigationMenuContentProps>(
	function NavigationMenuContent({ children, className }, forwardedRef) {
		const item = useNavigationMenuItemContext();
		const root = useNavigationMenuContext();

		const isOpen = root.value === item.value;

		// Convention C-1: the NODE, not a ref. The panel is created by
		// `presence.mounted`, so a `useRef` + `[]`-deps effect would still be
		// holding `null` when the dismiss layer and the positioner look for it,
		// and neither would ever arm — silently.
		const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

		const presence = usePresence(isOpen);

		// The placement as ACTUALLY resolved. Anchored to the whole list rather
		// than to a single trigger — every panel drops out of the row,
		// start-aligned to it — and the growth origin follows whatever
		// `computePosition` settled on: it flips the requested `"bottom"` to
		// `"top"` for a nav sitting low in the viewport, and the resolved ALIGN
		// differs from the requested one whenever clamping slid the panel along
		// the cross axis, where an entrance grown from the requested corner
		// would expand from the far corner instead.
		const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
			anchor: root.listRef,
			side: "bottom",
			align: "start",
			offset: 6,
		});

		// `active: isOpen` disarms the dismiss layer the instant the panel stops
		// being the open one, so a second Escape during the fade is neither
		// answered again nor swallowed on its way to whatever sits underneath.
		//
		// The trigger is excluded so a pointerdown on it is a toggle rather
		// than an outside click that closes and immediately reopens.
		useDismissable(panel, {
			onDismiss: root.close,
			exclude: () => [root.getTriggerElement(item.value)],
			active: isOpen,
		});

		// Only Enter/Space/ArrowDown on the trigger ever calls `requestFocus`
		// (see NavigationMenuTrigger) — a hover- or click-open leaves this a
		// no-op, and focus stays exactly where it already was.
		//
		// The node guard runs BEFORE the consume, where the source checks it
		// after: `useElementRef` publishes the panel one commit after the
		// branch mounts, so consuming on the pass where the node is still null
		// would spend the request on nothing and the focus move would be lost.
		// Same observable behaviour, one guard reordered.
		//
		// `consumeFocusRequest` in the dependency array is the subscription,
		// not ceremony: the root re-creates it whenever the pending focus value
		// moves, which is what re-runs this effect for a key press on a trigger
		// whose panel is ALREADY open — the one case where `isOpen`, `panel`
		// and `item.value` all stay put.
		const { consumeFocusRequest } = root;
		useIsomorphicLayoutEffect(() => {
			if (!isOpen) return;
			if (!panel) return;
			if (!consumeFocusRequest(item.value)) return;
			const target = panel.querySelector<HTMLElement>("a[href], button:not([disabled])") ?? panel;
			target.focus();
		}, [isOpen, panel, consumeFocusRequest, item.value]);

		// The disclosure equivalent of a trigger-side focusout handler: Tab is
		// never trapped in here (see the README — a modal focus trap would break
		// "Tab moves through the panel's links naturally"), so when focus leaves
		// this panel on its own, have the panel that no longer has focus close
		// itself rather than linger, invisible-to-the-eye-but-still-"open", off
		// in the portal.
		function handleFocusOut(event: FocusEvent<HTMLDivElement>) {
			const next = event.relatedTarget as Node | null;
			if (next && panel?.contains(next)) return;
			root.collapseIfOpen(item.value);
		}

		// Convention C-2: composed ABOVE the conditional below. Calling this
		// inside the JSX branch would be a conditional hook and would throw the
		// first time `mounted` flips.
		//
		// ONE bidirectional leg, never a split in/out pair: Svelte reports
		// `direction: "both"` for a bidirectional directive and cannot tell an
		// arrival from a departure on its own, and a bidirectional leg gets the
		// in-flight counterpart's position handed to it, so a panel re-opened
		// inside its own fade continues from where it is instead of snapping.
		// That matters more here than on a click-only surface: this one closes
		// on a hover-intent timer, and a pointer that wanders back onto the bar
		// mid-close is ordinary rather than exceptional.
		const panelRef = useComposedRefs(
			setPanelNode,
			forwardedRef,
			presence.register(anchored, (entering) => ({ side: resolvedSide, entering }))
		);

		/*
			No `role` here on purpose, same reasoning as Popover's content: this
			is a disclosure panel, not a dialog, and it has no title to anchor
			`aria-labelledby` on other than the trigger it already points at.
			Reachability comes from `aria-labelledby` + real DOM focus, not from
			a landmark role — and deliberately *not* from a focus trap: a
			NavigationMenu panel is not modal (see the README's "why not
			role=menu" section), so Tab must be free to walk out of it into the
			rest of the page.

			The motion lives in `internals/motion/anchored.js`, shared with every
			other floating surface. Two deliberate consequences: there are no
			pixels of `translateY` — travel a panel can only fake, since the
			positioner owns `left`/`top` on this same element — and the rise
			grows from the panel edge nearest the list rather than from its own
			centre. Visibility never depends on any of it: `presence.mounted`
			gates the DOM, and under reduced motion the panel simply appears and
			disappears.

			`data-state` is an ordinary React attribute (divergence D-2) carrying
			`surfaceState`'s TWO values — never `"opening"` (convention C-5).
			`inert` is not written by hand either: `usePresence` sets it on the
			registered node for the whole exit, which keeps a panel on its way
			out from taking a click on one of its links.

			`data-align` reports the REQUESTED alignment, as the source does,
			while the growth origin uses the RESOLVED one.

			Focus needs nothing here: `NavigationMenu`'s own `close()` refocuses
			the trigger from a plain function outside the mount gate, so the
			return lands at the dismiss instant rather than at unmount.

			`<Portal>` stays ABOVE the mounted gate, and the gate wraps its
			CHILDREN: `usePortalTarget` resolves its container in a layout
			effect, so a Portal that first mounts in the same commit as the
			surface renders null on that pass — presence would then find no
			registered legs and the entrance would be silently skipped.
		*/
		return (
			<Portal>
				{presence.mounted ? (
					<div
						ref={panelRef}
						id={item.contentId}
						aria-labelledby={item.triggerId}
						tabIndex={-1}
						className={cn(
							"ft-navigation-menu-content bg-popover text-popover-foreground border-border grid w-[480px] grid-cols-2 gap-2 rounded-xl border p-3.5 shadow-2xl outline-none",
							className
						)}
						data-state={presence.surfaceState}
						data-side={resolvedSide}
						data-align="start"
						style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
						onPointerEnter={root.cancelClose}
						onPointerLeave={root.scheduleClose}
						onBlur={handleFocusOut}
					>
						{children}
					</div>
				) : null}
			</Portal>
		);
	}
);

NavigationMenuContent.displayName = "NavigationMenuContent";
