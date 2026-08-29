import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import type { Side, Align } from "../../internals/anchor-position.js";
import { Portal } from "../../internals/Portal.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useFancyId } from "../../internals/use-id.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { runTransition } from "../../internals/motion/animate.js";
import type { TransitionRun } from "../../internals/motion/animate.js";

// The source gates its focusable-trigger warning on `import.meta.env.DEV`,
// which needs Vite's client types this package does not load.
// `process.env.NODE_ENV` is the equivalent signal every React consumer's
// bundler already replaces. Declared locally so the d.ts build needs no
// @types/node; the module-scoped declaration shadows any global one.
declare const process: undefined | { env: { NODE_ENV?: string } };
const DEV = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

export interface TooltipProps {
	/** The tooltip's text. Plain text only — a tooltip never holds interactive content. */
	content: string;
	/** Side of the trigger to place the tooltip on. */
	side?: Side;
	/** Alignment along the trigger's cross axis. */
	align?: Align;
	/** Gap in pixels between the trigger and the tooltip. */
	offset?: number;
	/** Delay in milliseconds before a hover opens the tooltip. Never applied to a focus open — see the README. */
	openDelay?: number;
	/** Delay in milliseconds before the tooltip closes once neither hovered nor focused. */
	closeDelay?: number;
	/** Suppresses the tooltip entirely — it never opens, on hover or focus, while true. */
	disabled?: boolean;
	/**
	 * The trigger. Must render exactly one focusable element (a button,
	 * link, `IconButton`, ...) — Tooltip attaches its hover/focus
	 * listeners and `aria-describedby` directly to it, imperatively,
	 * since there is no prop to hand them to it declaratively.
	 */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the trigger wrapper. */
	className?: string;
}

// A tooltip that isn't attached to something the keyboard can reach is the
// exact failure this component exists to prevent, and it fails silently
// otherwise — hovering still opens it, so it *looks* wired. Dev-only: the
// check itself has no effect on behavior, only on whether a misuse gets
// reported.
function isFocusable(el: HTMLElement): boolean {
	if ((el as HTMLButtonElement | HTMLInputElement).disabled) return false;
	if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return true;
	if (el.tagName === "A" && el.hasAttribute("href")) return true;
	const tabindex = el.getAttribute("tabindex");
	return tabindex !== null && tabindex !== "-1";
}

/**
 * A plain-text label anchored to a focusable trigger, opening on hover or
 * focus.
 *
 * The source declares `ref = $bindable(null)` for the trigger wrapper
 * element, so that element arrives through this component's ref channel
 * (PORTING.md §"API contract") rather than through a prop.
 */
export const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(function Tooltip(
	{
		content,
		side = "top",
		align = "center",
		offset = 6,
		openDelay = 500,
		closeDelay = 0,
		disabled = false,
		children,
		className,
	},
	forwardedRef
) {
	const tooltipId = useFancyId();

	const [open, setOpen] = useState(false);

	// The wrapper as a NODE (convention C-1): the listener-wiring effect below
	// is keyed on it, so it re-arms if the wrapper ever remounts, exactly as
	// the source effect keyed on `ref` does.
	const [wrapper, setWrapperNode] = useElementRef<HTMLSpanElement>();
	const wrapperRef = useComposedRefs(setWrapperNode, forwardedRef);

	// The trigger — the wrapper's first rendered child. State, not a plain
	// ref: the aria-describedby effect below has to react to it appearing.
	const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);

	// Three independent reasons to be open, each tracked on its own:
	// hovering the trigger, hovering the bubble itself, and focus. They are
	// three separate flags rather than one shared `hovered` flag
	// specifically for the trigger/bubble pair — the pointer crosses from
	// one to the other with both briefly true at once (enter the bubble
	// before leaving the trigger), and a single shared flag would let
	// whichever side's `pointerleave` fires *last* clobber the other side's
	// `pointerenter`, closing the tooltip while the pointer is still over
	// it. `updateVisibility` is the one place that turns the trio into an
	// open/closed decision, so releasing one never closes a tooltip the
	// others still want open.
	//
	// Refs, not state: nothing renders off them — only the `open` decision
	// they feed does, exactly where the source's reactivity re-renders markup.
	const triggerHovered = useRef(false);
	const contentHovered = useRef(false);
	const focused = useRef(false);

	const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	function clearTimers() {
		if (openTimer.current !== undefined) {
			clearTimeout(openTimer.current);
			openTimer.current = undefined;
		}
		if (closeTimer.current !== undefined) {
			clearTimeout(closeTimer.current);
			closeTimer.current = undefined;
		}
	}

	// Both `show` and `hide` clear whatever timer is currently pending
	// before scheduling their own — the fix for a rapid hover-out-hover-in:
	// without it, the leftover close timer from the "out" and the fresh
	// open timer from the "in" would both be alive at once, racing to set
	// opposite states.
	function show(delay: number) {
		clearTimers();
		if (delay <= 0) {
			setOpen(true);
			return;
		}
		openTimer.current = setTimeout(() => {
			openTimer.current = undefined;
			setOpen(true);
		}, delay);
	}

	function hide() {
		clearTimers();
		if (closeDelay <= 0) {
			setOpen(false);
			return;
		}
		closeTimer.current = setTimeout(() => {
			closeTimer.current = undefined;
			setOpen(false);
		}, closeDelay);
	}

	// Called from every hover/focus/blur handler below, and — separately —
	// from the effect further down that watches `disabled` itself. That
	// second caller is why `disabled` routes through `hide()` rather than a
	// bare early return: `updateVisibility` has to be able to force an
	// already-open tooltip closed when `disabled` flips true with the
	// pointer or focus still in place, not just decline to open a new one.
	function updateVisibility() {
		if (disabled) {
			hide();
			return;
		}
		if (triggerHovered.current || contentHovered.current || focused.current) {
			// A keyboard user tabbing through has to see the tooltip right
			// away, not wait out a hover-tuned delay meant to stop tooltips
			// from flashing as the mouse merely passes over things — so a
			// focus-driven open always uses a delay of 0, and only a hover
			// with no focus involved waits out `openDelay`.
			show(focused.current ? 0 : openDelay);
		} else {
			hide();
		}
	}

	// The trigger listeners live on the stack for the whole life of the
	// wrapper (the wiring effect below is keyed on the wrapper alone, exactly
	// like the source effect keyed on `ref`), so each goes through
	// `useEventCallback` and reads the current render's props without the
	// listeners ever being rebuilt.
	const handlePointerEnter = useEventCallback(() => {
		triggerHovered.current = true;
		updateVisibility();
	});
	const handlePointerLeave = useEventCallback(() => {
		triggerHovered.current = false;
		updateVisibility();
	});
	const handleFocus = useEventCallback(() => {
		focused.current = true;
		updateVisibility();
	});
	const handleBlur = useEventCallback(() => {
		focused.current = false;
		updateVisibility();
	});

	// Routed through the dismissable layer on the bubble (`escape: true,
	// outsideClick: false` — see below) rather than a keydown listener of its
	// own, so Escape has exactly one implementation across every overlay in
	// this family, not a second one that happens to agree with it today.
	// The layer decides by stack order, not by what currently has focus,
	// which is also why this closes instantly and never moves focus itself —
	// the trigger stays exactly where the keyboard user left it, unlike a
	// dismissed Popover/Dialog. Bypasses `closeDelay` on purpose, same as the
	// listener this replaced: Escape is a deliberate "get me out of here",
	// not a pointer drifting off that deserves a grace period.
	const handleDismiss = useEventCallback(() => {
		setOpen(false);
		clearTimers();
	});

	// The rendered tooltip bubble gets its own hover flag rather than
	// sharing the trigger's — see `triggerHovered`/`contentHovered` above.
	// Without this, moving the pointer off the trigger and onto the bubble
	// itself (when the bubble sits in the pointer's path) would read as
	// "left the trigger" and close it out from under the pointer before it
	// arrives.
	const handleContentPointerEnter = useEventCallback(() => {
		contentHovered.current = true;
		updateVisibility();
	});
	const handleContentPointerLeave = useEventCallback(() => {
		contentHovered.current = false;
		updateVisibility();
	});

	// The only path into `updateVisibility` that isn't a DOM event: `disabled`
	// is a prop, and toggling it doesn't fire a pointer/focus event on its
	// own. Without this, flipping `disabled` true while hovered or focused
	// would hide the bubble only via the `open && !disabled` gate below,
	// leaving `open` itself still `true` underneath — so flipping `disabled`
	// back to `false` with the pointer never having left would pop the bubble
	// straight back, skipping `openDelay` entirely, since nothing would have
	// gone through `show()` to schedule it.
	//
	// Keyed on `disabled` alone — the React spelling of the source's
	// `untrack(updateVisibility)`: the hover/focus flags are refs, so a
	// change to them never re-runs this effect on top of the direct call
	// each handler above already makes.
	const updateVisibilityEvent = useEventCallback(updateVisibility);
	useEffect(() => {
		updateVisibilityEvent();
	}, [disabled, updateVisibilityEvent]);

	// `children` is caller content, not something this component renders
	// itself, so there is no prop to declaratively attach the hover/focus
	// listeners to its root element — they're attached imperatively, to the
	// wrapper's first rendered child, once it exists. Only depends on the
	// wrapper node: re-attaching the same listeners every time `disabled`
	// merely toggles would be pure churn now that `disabled` has its own
	// effect above.
	useEffect(() => {
		if (!wrapper) return;
		const el = wrapper.firstElementChild as HTMLElement | null;
		setTriggerEl(el);
		if (!el) return;

		if (DEV && !isFocusable(el)) {
			console.warn(
				"[Tooltip] The first element rendered by `children` is not focusable, so this tooltip is unreachable by keyboard even though it will still open on hover. Render a real interactive element (a <button>, <a href>, or similar) as the first thing inside `children`."
			);
		}

		el.addEventListener("pointerenter", handlePointerEnter);
		el.addEventListener("pointerleave", handlePointerLeave);
		el.addEventListener("focus", handleFocus);
		el.addEventListener("blur", handleBlur);

		return () => {
			el.removeEventListener("pointerenter", handlePointerEnter);
			el.removeEventListener("pointerleave", handlePointerLeave);
			el.removeEventListener("focus", handleFocus);
			el.removeEventListener("blur", handleBlur);
		};
	}, [wrapper, handlePointerEnter, handlePointerLeave, handleFocus, handleBlur]);

	// Separate from the listener-wiring effect above: this one has to react
	// to `open` and `disabled`, not just the wrapper, so the attribute is
	// only ever present while there is really a mounted element behind it —
	// the bubble below shares the exact same `open && !disabled` gate.
	// Reacting to `open` here rather than in the wiring effect also keeps
	// the listeners themselves from being torn down and re-attached on every
	// open/close.
	useEffect(() => {
		if (!triggerEl || disabled || !open) return;
		const el = triggerEl;
		el.setAttribute("aria-describedby", tooltipId);
		return () => {
			el.removeAttribute("aria-describedby");
		};
	}, [triggerEl, disabled, open, tooltipId]);

	// The source's `onDestroy(clearTimers)`.
	useEffect(() => clearTimers, []);

	const mounted = open && !disabled;

	// The bubble as a NODE (convention C-1): it is created by the `mounted`
	// gate, so a `useRef` read inside a `[]`-deps effect would still be null
	// when the position, dismiss and entrance effects fire.
	const [bubble, setBubbleNode] = useElementRef<HTMLDivElement>();

	// The placement as ACTUALLY resolved — the requested side and align until
	// `computePosition` flips or clamps it away from a viewport edge. Seeded
	// with the REQUESTED values by the hook itself, so a bubble that never
	// flips reads the right growth origin without depending on whether the
	// first placement has run yet. `resolvedAlign` differs from the requested
	// alignment whenever clamping slid the panel along the cross axis — near
	// a viewport edge the requested corner is no longer the one touching the
	// anchor, and an entrance grown from it would expand from the far corner
	// instead.
	const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(bubble, {
		anchor: () => triggerEl,
		side,
		align,
		offset,
	});

	useDismissable(bubble, { onDismiss: handleDismiss, escape: true, outsideClick: false });

	// An entrance and NEVER an exit — the source uses `in:` and not
	// `transition:`. Instant-out is the whole point of a tooltip: a label
	// that lingers on its way out makes the pointer feel sticky, and an
	// outro would also delay the unmount that `closeDelay`, Escape and blur
	// all expect to be immediate. That is why this is a bare `runTransition`
	// on mount rather than a presence clock: there is no exit window to keep
	// the node alive through. The open delay above is a *scheduling* delay —
	// nothing is mounted while it runs — so it is not, and must not become,
	// the transition's `delay`.
	//
	// `scale: false` keeps the entrance opacity-only, exactly as it has
	// always been: a tooltip is a label, not a surface, so it has no "grew
	// out of the trigger" story that a scale would tell. The origin is still
	// written, so a consumer styling off `data-side` gets the same
	// information every other panel exposes.
	//
	// A layout effect, per the effect-phase policy: the source starts intros
	// pre-paint, and a passive effect would paint one frame at rest first.
	// Reduced motion needs no rule of its own: `anchored` collapses the
	// duration to 0 and `runTransition`'s falsy-duration fast path then
	// skips `element.animate()` entirely — the bubble is simply there, in
	// the frame it mounted.
	const resolvedSideRef = useLiveRef(resolvedSide);
	useIsomorphicLayoutEffect(() => {
		if (!bubble) return;
		let run: TransitionRun | undefined;
		run = runTransition(
			bubble,
			anchored(bubble, { side: resolvedSideRef.current, scale: false }, { direction: "in" }),
			1,
			undefined,
			// On enter finish, abort the run: it removes the `fill: forwards`
			// so the element returns to its resting style — which *is* the
			// visible end state by construction. On the synchronous
			// reduced-motion path `run` is still unset here, and there is
			// nothing to abort.
			() => run?.abort()
		);
		return () => run?.abort();
	}, [bubble, resolvedSideRef]);

	// The bubble's hover handlers are attached natively rather than through
	// synthetic props: the source listens for real `pointerenter` /
	// `pointerleave`, and React's enter/leave plugin synthesises those from
	// `pointerover`/`pointerout` instead of listening for them.
	useEffect(() => {
		if (!bubble) return;
		bubble.addEventListener("pointerenter", handleContentPointerEnter);
		bubble.addEventListener("pointerleave", handleContentPointerLeave);
		return () => {
			bubble.removeEventListener("pointerenter", handleContentPointerEnter);
			bubble.removeEventListener("pointerleave", handleContentPointerLeave);
		};
	}, [bubble, handleContentPointerEnter, handleContentPointerLeave]);

	const wrapperClasses = cn("ft-tooltip-trigger inline-flex", className);

	// `data-align` publishes the REQUESTED alignment, exactly as the source
	// does; only the transform origin follows the resolved one.
	return (
		<>
			<span ref={wrapperRef} className={wrapperClasses}>
				{children}
			</span>
			<Portal>
				{mounted ? (
					<div
						ref={setBubbleNode}
						id={tooltipId}
						role="tooltip"
						className="ft-tooltip bg-primary text-primary-foreground pointer-events-auto z-50 rounded-[6px] px-[10px] py-[5px] text-[11px] font-medium shadow-lg"
						data-side={resolvedSide}
						data-align={align}
						style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
					>
						{content}
					</div>
				) : null}
			</Portal>
		</>
	);
});

Tooltip.displayName = "Tooltip";
