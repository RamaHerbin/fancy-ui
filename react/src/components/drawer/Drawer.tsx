import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useFocusTrap } from "../../internals/focus-trap.js";
import { useScrollLock } from "../../internals/scroll-lock.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useFancyId } from "../../internals/use-id.js";
import { anchored, prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";
import "./drawer.css";

export interface DrawerProps {
	/** Whether the drawer is open. Controlled when given; the component keeps its own copy either way. */
	open?: boolean;
	/** Called with the new value whenever the drawer opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/** Heading rendered in the header and wired to `aria-labelledby`. */
	title?: string;
	/** Supporting text under the title, wired to `aria-describedby`. */
	description?: string;
	/** Whether Escape, the scrim and the close button can close the drawer. */
	dismissible?: boolean;
	/** Whether dragging the handle down past the threshold closes the drawer. */
	swipeToClose?: boolean;
	/** Panel body content. */
	children?: ReactNode;
	/** Content pinned below the body, e.g. actions. */
	footer?: ReactNode;
	/** Additional CSS classes merged onto the panel. */
	className?: string;
}

// Fixed pixel distance rather than a percentage of the panel's own
// height: the panel's rendered height depends on its content, so a
// percentage threshold would make the same physical drag distance close
// the drawer sometimes and not others. A flat distance also keeps the
// gesture's tests deterministic without needing real layout from jsdom.
const DISMISS_THRESHOLD_PX = 96;
// Matches the transition-duration on `.ft-drawer-panel--releasing` in drawer.css.
const SPRING_BACK_MS = 200;

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(
	{
		open: openProp,
		onOpenChange,
		title,
		description,
		dismissible = true,
		swipeToClose = true,
		children,
		footer,
		className,
	},
	forwardedRef
) {
	// The React shape of the source's `open = $bindable(false)`: an internal
	// copy seeded from the prop, re-synced during render whenever the CALLER
	// changes the prop, and free to move on its own in between. Re-synced in
	// the render path, not an effect: an effect would paint one frame of the
	// stale value first.
	const [open, setOpenState] = useState(openProp ?? false);
	const [lastOpenProp, setLastOpenProp] = useState(openProp);
	if (lastOpenProp !== openProp) {
		setLastOpenProp(openProp);
		setOpenState(openProp ?? false);
	}

	function close() {
		if (!open) return;
		setOpenState(false);
		onOpenChange?.(false);
	}

	// Swiping is a second way to trigger the same `dismissible` decision the
	// close button, scrim and Escape already respect — a drawer marked
	// non-dismissible can't be swiped away either, only closed
	// programmatically by the caller.
	const canSwipe = dismissible && swipeToClose;

	// `dragY` is a live pixel offset applied as an inline transform while a
	// pointer drag is in progress; it is not layout (no height/top changes),
	// so dragging never triggers reflow of the page behind the drawer.
	//
	// A ref plus a direct style write, not state: the value moves once per
	// pointermove and drives nothing but this one inline transform, so a
	// re-render per frame would buy nothing (the source's `style:transform`
	// is that same per-frame write, routed through its compiler).
	const dragYRef = useRef(0);
	const draggingRef = useRef(false);
	// True for the short window after a released drag springs back to 0 —
	// the only time a transition is applied to `transform`, so live dragging
	// itself always tracks the pointer with zero lag. State, not a ref: it
	// toggles a class on the rendered panel.
	const [releasing, setReleasing] = useState(false);
	const activePointerIdRef = useRef<number | null>(null);
	const dragStartYRef = useRef(0);
	const springBackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	// One seed per instance, suffixed for title/description — SSR-stable.
	const uid = useFancyId();
	const titleId = title ? `${uid}-title` : undefined;
	const descriptionId = description ? `${uid}-description` : undefined;

	// Convention C-1: the NODE, not a ref. The panel is created by
	// `presence.mounted`, so a `useRef` + `[]`-deps effect would still be
	// holding `null` when the trap's effect fires and the trap would never
	// arm — silently.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

	// Returns the two functions the source hands out through `onActivate`:
	// the eager return, and the re-arm.
	const trap = useFocusTrap(panel);

	// The one place this component owns motion, and the other half of the
	// swipe gesture. Not `anchored`: that helper is scale+opacity by design
	// and carries no translate term, and a drawer's whole gesture is travel.
	// Not a pixel distance either — the panel's height depends on its
	// content, and only `%` clears its own edge whatever that height is.
	//
	// The exit does not halve its travel the way the scale rung does: a
	// drawer that slid half-way down and then vanished reads worse than one
	// that simply leaves. A named exception, not an oversight.
	//
	// `from` is where the panel is at the instant the exit starts, read
	// straight off the live `dragYRef` rather than from a value captured on
	// the way into `close()`. A parent writing `open` to false — mid-drag
	// included — never goes through `close()` at all, and a captured offset
	// would then still be 0 while the panel's inline transform sat at the
	// finger's position: the drawer would snap back to rest and only then
	// slide out. `dragYRef` is already correct on every path: 0 for a scrim
	// click, Escape and the close button, and left exactly where the finger
	// let go for a past-threshold release. At `t = 1` the panel sits exactly
	// there; at `t = 0` it is a full height below the viewport. One
	// continuous motion rather than a snap back followed by a slide. On the
	// way in `from` is always 0: an entrance starts off-screen and ends at
	// rest, and a stale offset from an earlier swipe must not become the
	// resting position.
	function drawerSlide(_node: Element, params?: { entering: boolean }): TransitionSpec {
		const reduced = prefersReducedMotion();
		const entering = params?.entering ?? false;
		const from = entering ? 0 : dragYRef.current;
		return {
			delay: 0,
			// Reduced motion collapses this to 0, which makes `runTransition`
			// finish synchronously and never touch `element.animate()` — so
			// the close is exactly as synchronous as it was before the drawer
			// animated out at all.
			duration: reduced ? 0 : entering ? DURATIONS.base : DURATIONS.exit,
			easing: entering ? JS_EASINGS.out : JS_EASINGS.in,
			css: (t, u) => `transform: translateY(calc(${from}px * ${t} + 100% * ${u}))`,
		};
	}

	const presence = usePresence(open, {
		// The two halves of the focus handshake, at the two moments the
		// source puts them: `onintrostart` → rearm, `onoutrostart` →
		// returnFocusNow.
		//
		// `returnFocusNow` at the dismiss instant is the whole point: it is
		// called on EVERY close path (Escape, the scrim, the close button, a
		// past-threshold swipe, a caller's own `open` write). Waiting for the
		// trap's own destroy would leave a keyboard user on `<body>` for the
		// whole length of the slide-out, because the closing panel is made
		// inert the instant the exit starts.
		//
		// `rearm` is the other half. A drawer reopened DURING its exit
		// reverses instead of remounting, so the trap is never re-created:
		// without this the panel would come back `aria-modal` and interactive
		// with focus left on the trigger behind it, and the eager return
		// already spent for the life of the instance.
		onEnterStart: () => trap.rearm(),
		onExitStart: () => trap.returnFocusNow(),
	});

	// The drag offset is deliberately NOT zeroed on a past-threshold release
	// (see `handlePointerUp`) — it is the exit's start point. The reset
	// therefore happens on the way back IN, before paint, so a drawer swiped
	// shut does not reopen already pushed down by the last swipe's distance.
	useIsomorphicLayoutEffect(() => {
		if (!open) return;
		dragYRef.current = 0;
		if (panel) panel.style.transform = "translateY(0px)";
	}, [open, panel]);

	// A drag released below the threshold arms the spring-back timer; if the
	// drawer unmounts before it fires — closed by its own trigger, or the
	// whole overlay removed some other way — nothing would otherwise clear it.
	useEffect(() => {
		return () => {
			clearTimeout(springBackTimerRef.current);
		};
	}, []);

	// Release timing: keyed on `presence.mounted`, not `open`, so the page
	// stays locked until the panel has actually finished sliding out instead
	// of unlocking the instant `open` flips and leaving the page scrollable
	// under a scrim still on screen — the same reason the source reached for
	// `use:scrollLock` (outro-delayed destroy) over an `$effect`.
	useScrollLock(presence.mounted);

	// `active: open` — a plain boolean where the source needed `() => open`.
	// The layer stays ON the stack for its whole exit and stops being TOP of
	// it the instant `open` flips, so a second Escape during the slide-out
	// changes nothing.
	useDismissable(panel, {
		onDismiss: close,
		escape: dismissible,
		outsideClick: dismissible,
		active: open,
	});

	// Convention C-2: composed ABOVE the conditional below.
	const panelRef = useComposedRefs(
		setPanelNode,
		forwardedRef,
		presence.register("panel", drawerSlide, (entering) => ({ entering }))
	);

	// The scrim fades on opacity alone (`scale: false`) while the panel
	// travels, and both run the same clock, so they leave together and the
	// unmount is a tie rather than a straggler.
	const scrimRef = presence.register("scrim", anchored, (entering) => ({
		entering,
		scale: false,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}));

	function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (!canSwipe) return;
		if (event.pointerType === "mouse" && event.button !== 0) return;
		clearTimeout(springBackTimerRef.current);
		activePointerIdRef.current = event.pointerId;
		dragStartYRef.current = event.clientY;
		draggingRef.current = true;
		setReleasing(false);
		// Keeps receiving pointermove/pointerup on this element even if the
		// pointer strays outside it mid-drag (a fast, slightly diagonal
		// swipe easily leaves a few-pixel-tall handle row).
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
		if (!draggingRef.current || event.pointerId !== activePointerIdRef.current) return;
		// Only downward drag moves the panel; upward movement clamps at 0
		// rather than lifting the drawer past its resting position.
		dragYRef.current = Math.max(0, event.clientY - dragStartYRef.current);
		if (panel) panel.style.transform = `translateY(${dragYRef.current}px)`;
	}

	function releaseCapture(event: React.PointerEvent<HTMLDivElement>) {
		(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
	}

	// Below the threshold: spring back rather than sticking wherever the
	// pointer let go. `releasing` must be IN the DOM before the transform
	// write for the CSS transition to pick the change up — the source's
	// reactive writes flush together; here `flushSync` is what puts the class
	// and the transform in the same frame.
	function springBack() {
		flushSync(() => {
			setReleasing(true);
		});
		dragYRef.current = 0;
		if (panel) panel.style.transform = "translateY(0px)";
		springBackTimerRef.current = setTimeout(() => {
			setReleasing(false);
		}, SPRING_BACK_MS);
	}

	function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
		if (!draggingRef.current || event.pointerId !== activePointerIdRef.current) return;
		draggingRef.current = false;
		activePointerIdRef.current = null;
		releaseCapture(event);

		if (dragYRef.current > DISMISS_THRESHOLD_PX) {
			// `dragYRef` is NOT zeroed here. Zeroing it used to be harmless
			// because removal was instant; with an exit it would snap the
			// panel back up to rest and then slide it down — two gestures
			// where the user made one. `close()` captures the offset as the
			// exit's start point instead, so the slide-out carries on from
			// exactly where the finger let go.
			close();
			return;
		}

		springBack();
	}

	function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
		if (!draggingRef.current || event.pointerId !== activePointerIdRef.current) return;
		draggingRef.current = false;
		activePointerIdRef.current = null;
		releaseCapture(event);
		springBack();
	}

	const panelClasses = cn(
		"ft-drawer-panel bg-popover text-popover-foreground fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col gap-3 rounded-t-[14px] border-t border-r border-l border-border pt-3.5 pr-5 pb-5 pl-5 shadow-2xl",
		releasing && "ft-drawer-panel--releasing",
		className
	);

	// No portal-before-focus-trap ordering ceremony here (divergence D-10):
	// `createPortal` commits children into the container before any effect
	// runs and refs populate before layout effects, so the node the trap
	// focuses is always connected.
	//
	// The `Portal` stays mounted and its CHILDREN are what `presence.mounted`
	// gates — `usePortalTarget` resolves its container in a layout effect, so
	// a `Portal` mounting in the same commit as the surface would skip the
	// entrance outright (the same hoist `DialogSurface` records).
	//
	// `data-state` is an ordinary attribute (divergence D-2) carrying
	// `surfaceState`'s TWO values (convention C-5); `inert` is not written by
	// hand, because `usePresence` sets it on every registered node for the
	// whole exit. The inline transform still carries the live drag offset,
	// and the two never fight: a running animation wins over an inline style,
	// so the transition owns `transform` for the whole exit and hands back to
	// the inline value only once it is finished — by which point the panel is
	// gone.
	return (
		<Portal>
			{presence.mounted ? (
				<>
					<div
						ref={scrimRef}
						className="ft-drawer-scrim fixed inset-0 z-50 bg-black/60"
						aria-hidden="true"
					/>
					<div
						ref={panelRef}
						className={panelClasses}
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						aria-describedby={descriptionId}
						data-state={presence.surfaceState}
						style={{ transform: "translateY(0px)" }}
					>
						<div
							className="ft-drawer-drag-surface flex flex-col items-center gap-2 pb-1"
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
							onPointerCancel={handlePointerCancel}
						>
							<span className="ft-drawer-handle" aria-hidden="true"></span>
							{title ? (
								<h2 id={titleId} className="w-full text-[14px] font-semibold">
									{title}
								</h2>
							) : null}
							{description ? (
								<p
									id={descriptionId}
									className="text-muted-foreground w-full text-[12px] leading-relaxed"
								>
									{description}
								</p>
							) : null}
						</div>
						{dismissible ? (
							<button
								type="button"
								className="ft-drawer-close text-muted-foreground hover:text-foreground absolute top-3.5 right-5 cursor-pointer text-[13px] leading-none"
								aria-label="Close"
								onClick={close}
							>
								✕
							</button>
						) : null}
						<div className="ft-drawer-body flex flex-1 flex-col gap-3 overflow-y-auto">
							{children}
						</div>
						{footer ? <div className="ft-drawer-footer flex justify-end gap-2">{footer}</div> : null}
					</div>
				</>
			) : null}
		</Portal>
	);
});

Drawer.displayName = "Drawer";
