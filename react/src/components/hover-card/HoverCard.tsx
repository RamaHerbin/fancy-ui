import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import type { Side, Align } from "../../internals/anchor-position.js";
import { Portal } from "../../internals/Portal.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";

export interface HoverCardProps {
	/**
	 * Whether the card is open.
	 *
	 * The source declares this bindable; React has no two-way channel, so the
	 * component keeps its own copy either way and re-syncs it whenever the
	 * CALLER changes the prop. That is what makes all three documented call
	 * shapes work off one implementation — a caller driving `open` from its
	 * own state, a caller who passes only `onOpenChange`, and a caller who
	 * passes a plain unbound value alongside it.
	 */
	open?: boolean;
	/** Fires whenever the open state changes, from any trigger — pointer, focus, Escape or an outside click. */
	onOpenChange?: (open: boolean) => void;
	/** Side of the trigger the card opens on. Flips to the opposite side when it would overflow the viewport. */
	side?: Side;
	/** Alignment along the trigger's cross axis. */
	align?: Align;
	/** Gap in pixels between the trigger and the card. */
	offset?: number;
	/** Delay in ms before the card opens after the pointer enters the trigger. Ignored for focus, which opens immediately. */
	openDelay?: number;
	/**
	 * Delay in ms before the card closes after the pointer leaves the trigger
	 * or the card. Gives the pointer time to travel from one to the other
	 * without the card vanishing mid-trip. Ignored for blur, which closes
	 * immediately.
	 */
	closeDelay?: number;
	/**
	 * The element that opens the card on hover or focus. Called with the
	 * card's id (or `undefined` while closed) — put it on your own trigger
	 * element's `aria-describedby` yourself. HoverCard cannot do this for
	 * you: the wrapper it renders around this node has no accessible role of
	 * its own, so an attribute set there would not be picked up for whatever
	 * focusable element you render inside it.
	 */
	trigger?: (descriptionId: string | undefined) => ReactNode;
	/**
	 * The card's content. Supplementary only — nothing inside should be the
	 * only way to reach information or an action. See the README before
	 * putting links or buttons in here.
	 */
	children?: ReactNode;
	/** Additional classes for the card panel. */
	className?: string;
}

/**
 * A rich preview card that opens on hover or focus, anchored to its trigger.
 *
 * The source declares `ref = $bindable(null)` for the TRIGGER WRAPPER
 * element, so that element arrives through this component's ref channel
 * (PORTING.md §"API contract") rather than through a prop.
 */
export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(function HoverCard(
	{
		open: openProp,
		onOpenChange,
		side = "bottom",
		align = "center",
		offset = 8,
		openDelay = 300,
		closeDelay = 150,
		trigger,
		children,
		className,
	},
	forwardedRef
) {
	// One id, stable across SSR and hydration — `uid()` would throw on the
	// server, and this needs to exist before the card ever opens so the
	// trigger's aria-describedby always resolves to a real element the moment
	// it points at one. `useFancyId()` is the counterpart of the source's
	// `$props.id()` (convention C-6).
	const panelId = useFancyId();

	// The React shape of the source's `open = $bindable(false)`: an internal
	// copy seeded from the prop, re-synced during render whenever the CALLER
	// changes the prop, and free to move on its own in between. Re-synced in
	// the render path, not an effect — an effect would paint one frame of the
	// stale value first.
	const [open, setOpenState] = useState(openProp ?? false);
	const [lastOpenProp, setLastOpenProp] = useState(openProp);
	if (lastOpenProp !== openProp) {
		setLastOpenProp(openProp);
		setOpenState(openProp ?? false);
	}

	const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	function clearOpenTimer() {
		if (openTimer.current !== undefined) {
			clearTimeout(openTimer.current);
			openTimer.current = undefined;
		}
	}

	function clearCloseTimer() {
		if (closeTimer.current !== undefined) {
			clearTimeout(closeTimer.current);
			closeTimer.current = undefined;
		}
	}

	// The one place `open` changes. The guard is what makes a change that
	// changes nothing fire nothing: a second Escape during the fade must not
	// call `onOpenChange(false)` a second time. Read through a live ref so
	// the timer callbacks scheduled below always compare against the current
	// value, not the render they were scheduled in.
	const openRef = useLiveRef(open);
	// The notification goes out through the house event-callback wrapper for
	// the same reason: a timer scheduled at pointerenter fires up to
	// `openDelay` later, and it must call the callback the caller has THEN,
	// not the closure captured when the delay started. The source reads
	// `onOpenChange` off `$props()` at call time, so a parent that re-rendered
	// inside the window is notified against its current state. It also keeps
	// `setOpen` identity-stable.
	const emitOpenChange = useEventCallback(onOpenChange);
	const setOpen = useCallback(
		(next: boolean) => {
			clearOpenTimer();
			clearCloseTimer();
			if (openRef.current === next) return;
			setOpenState(next);
			emitOpenChange(next);
		},
		[openRef, emitOpenChange]
	);

	function scheduleOpen() {
		// A pointer arriving back on the trigger while a close is pending (it
		// travelled trigger → card → trigger) must cancel that close rather
		// than restart the open delay — the card never actually closed.
		clearCloseTimer();
		if (open) return;
		clearOpenTimer();
		openTimer.current = setTimeout(() => setOpen(true), openDelay);
	}

	// Called when the pointer leaves the trigger AND when it leaves the card.
	// The delay is what lets it cross the gap between the two: if it lands on
	// the other one before this fires, that element's own pointerenter clears
	// the timer first.
	function scheduleClose() {
		clearOpenTimer();
		if (!open) return;
		clearCloseTimer();
		closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
	}

	// The source's `onMount` teardown: both timers die with the component.
	useEffect(() => {
		return () => {
			if (openTimer.current !== undefined) clearTimeout(openTimer.current);
			if (closeTimer.current !== undefined) clearTimeout(closeTimer.current);
		};
	}, []);

	// A plain ref, not state: nothing renders off it. The panel reads it
	// lazily, through an anchor getter and an exclude getter that both run
	// after the wrapper has committed — the wrapper is this component's own
	// first child, so its ref is attached before the panel's subtree runs any
	// effect of its own.
	const triggerRef = useRef<HTMLDivElement | null>(null);
	const triggerWrapperRef = useComposedRefs(triggerRef, forwardedRef);

	// The NODE, not a ref (convention C-1): the panel is created by
	// `presence.mounted`, so a `useRef` read inside a `[]`-deps effect would
	// still be null when the position and dismiss effects fire and neither
	// would ever arm — silently.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

	// The mount clock. It keeps the panel on screen for the length of its
	// exit — the job the source's `{#if open}` branch plus outro did — and
	// sets `inert` on the registered node for that whole window, which is
	// what stops the pointer interacting with a card it has already left.
	const presence = usePresence(open);

	// The placement as ACTUALLY resolved — the requested side and align until
	// `computePosition` flips or clamps it away from a viewport edge. Seeded
	// with the REQUESTED values by the hook itself rather than a hardcoded
	// "bottom"/"center", so a card that never flips reads the right growth
	// origin without depending on whether the first placement has run yet.
	//
	// `resolvedAlign` differs from the requested alignment whenever clamping
	// slid the panel along the cross axis — near a viewport edge the
	// requested corner is no longer the one touching the anchor, and an
	// entrance grown from it would expand from the far corner instead.
	const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
		anchor: () => triggerRef.current,
		side,
		align,
		offset,
	});

	// `active: open` — a plain boolean where the source needed a getter. The
	// layer stays ON the stack for its whole exit and stops being TOP of it
	// the instant `open` flips, so an Escape during the fade reaches whatever
	// layer is underneath rather than being swallowed by a card that is
	// leaving.
	useDismissable(panel, {
		onDismiss: () => setOpen(false),
		exclude: () => [triggerRef.current],
		active: open,
	});

	// Convention C-2: composed ABOVE the conditional below.
	//
	// ONE bidirectional transition, never a split in/out pair. This is the
	// directive that earns its keep most on a hover surface: pointers change
	// their mind, and a unified leg passes the in-flight counterpart's
	// current position into the fresh call, so a card the pointer comes back
	// to mid-fade continues from where it is instead of snapping to invisible
	// and starting the entrance over. `entering` is what tells it which way
	// it is going, and the params are read at the instant each leg starts.
	const panelRef = useComposedRefs(
		setPanelNode,
		presence.register(anchored, (entering) => ({ side: resolvedSide, entering }))
	);

	// The documented contract is that nothing inside the card is interactive
	// (see the README), so in the shape this component was designed for,
	// focus never moves from the trigger into the card and this check never
	// matters. It exists for the caller who ignores that contract anyway: an
	// unconditional close-on-blur would unmount the card the instant Tab
	// starts moving focus toward whatever they put inside it — vanishing out
	// from under a keyboard user reaching for something a mouse user could
	// already click freely, since a mouse click never routes through the
	// trigger's focus at all. Checking `relatedTarget` against the panel is
	// the standard trigger-to-content handoff: don't close if focus is
	// headed into the very thing that would otherwise disappear.
	function handleTriggerFocusOut(event: FocusEvent<HTMLDivElement>) {
		const next = event.relatedTarget as Node | null;
		if (next && panel?.contains(next)) return;
		setOpen(false);
	}

	const classes = cn(
		"ft-hover-card-panel bg-popover text-popover-foreground border-border flex w-60 flex-col gap-2.5 rounded-xl border p-3.5 shadow-[0_12px_32px_rgba(0,0,0,.5)]",
		className
	);

	// `closeDelay` and the exit are two different waits and both are wanted.
	// `closeDelay` is the grace period the pointer gets to travel from the
	// trigger to the card, spent BEFORE anything visible happens; the exit is
	// the card leaving, spent after. `open` still flips at the end of the
	// delay, so `onOpenChange(false)` and the caller's controlled value are
	// exactly where they were — only the removal now trails it by 150 ms.
	//
	// The `Portal` stays ABOVE the mounted gate, and the gate wraps its
	// CHILDREN, so the portal resolves a container BEFORE the commit that
	// opens the card and the entrance leg has a node to attach to.
	//
	// `data-state` is an ordinary attribute (divergence D-2) carrying
	// `surfaceState`'s TWO values — never `"opening"` (convention C-5). The
	// source needed `markSurfaceState` only because its scheduler skips
	// effects inside a closing branch; React re-renders the exiting surface
	// normally. `inert` is not written by hand either: `usePresence` sets it
	// on the registered node for the whole exit.
	//
	// `data-align` publishes the REQUESTED alignment, exactly as the source
	// does; only the transform origin follows the resolved one.
	//
	// Reduced motion needs no rule of its own: `anchored` collapses the
	// duration to 0, `runTransition`'s falsy-duration fast path then skips
	// `element.animate()` entirely, and the card appears and disappears in
	// the frame it mounts and unmounts. Its visibility never depended on the
	// animation — the presence clock alone decides that.
	return (
		<>
			<div
				ref={triggerWrapperRef}
				className="ft-hover-card-trigger inline-block"
				onPointerEnter={scheduleOpen}
				onPointerLeave={scheduleClose}
				onFocus={() => setOpen(true)}
				onBlur={handleTriggerFocusOut}
			>
				{trigger?.(open ? panelId : undefined)}
			</div>
			<Portal>
				{presence.mounted ? (
					<div
						ref={panelRef}
						id={panelId}
						className={classes}
						data-state={presence.surfaceState}
						data-side={resolvedSide}
						data-align={align}
						style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
						onPointerEnter={clearCloseTimer}
						onPointerLeave={scheduleClose}
					>
						{children}
					</div>
				) : null}
			</Portal>
		</>
	);
});

HoverCard.displayName = "HoverCard";
