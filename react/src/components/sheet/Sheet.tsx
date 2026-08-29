import { forwardRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useFocusTrap } from "../../internals/focus-trap.js";
import { useScrollLock } from "../../internals/scroll-lock.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { anchored, prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";

export type SheetSide = "left" | "right" | "top" | "bottom";
export type SheetSize = "sm" | "md" | "lg";

export interface SheetProps {
	/** Whether the sheet is open. Controlled when given; the component keeps its own copy either way. */
	open?: boolean;
	/** Called with the new value whenever the sheet opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/** Edge of the viewport the panel slides in from. */
	side?: SheetSide;
	/** Heading rendered in the header and wired to `aria-labelledby`. */
	title?: string;
	/** Supporting text under the title, wired to `aria-describedby`. */
	description?: string;
	/** Whether Escape, the scrim and the close button can close the sheet. */
	dismissible?: boolean;
	/** Panel width (left/right sides) or height (top/bottom sides). */
	size?: SheetSize;
	/** Panel body content. */
	children?: ReactNode;
	/** Content pinned below the body, e.g. actions. */
	footer?: ReactNode;
	/** Additional CSS classes merged onto the panel. */
	className?: string;
}

// The one place this component owns motion. Not `anchored`: that helper is
// scale+opacity by design and deliberately carries no translate term, and a
// sheet's whole gesture is travel. Not a pixel-distance preset either — a
// sheet has to clear its own edge whatever its size, which only `%`
// expresses.
//
// The exit does NOT halve its travel the way the scale rung does. A sheet
// that slid half-way off the viewport and then vanished would read worse
// than one that simply leaves; it is a named exception to the half-delta
// exit rule rather than an oversight.
function edgeSlide(
	_node: Element,
	params?: { side: SheetSide; entering: boolean }
): TransitionSpec {
	const reduced = prefersReducedMotion();
	const entering = params?.entering ?? false;
	const side = params?.side ?? "right";
	const axis = side === "left" || side === "right" ? "X" : "Y";
	const sign = side === "left" || side === "top" ? -1 : 1;
	return {
		delay: 0,
		// Reduced motion collapses this to 0, which makes `runTransition`
		// finish synchronously and never touch `element.animate()` — so the
		// close is exactly as synchronous as it was before the sheet animated
		// out at all.
		duration: reduced ? 0 : entering ? DURATIONS.base : DURATIONS.exit,
		easing: entering ? JS_EASINGS.out : JS_EASINGS.in,
		// `u = 1 - t`: fully out at t=0, resting at t=1. No opacity term — a
		// sheet leaves by travelling, and fading it as well reads as two
		// gestures fighting.
		css: (_t, u) => `transform: translate${axis}(${sign * 100 * u}%)`,
	};
}

const POSITION_CLASSES: Record<SheetSide, string> = {
	left: "inset-y-0 left-0 border-r border-border",
	right: "inset-y-0 right-0 border-l border-border",
	top: "inset-x-0 top-0 border-b border-border",
	bottom: "inset-x-0 bottom-0 border-t border-border",
};

// Literal Tailwind class strings (not template-built at runtime) so the
// Tailwind v4 source scanner — which reads this file as text, not as
// evaluated JS — can see every candidate class it needs to generate.
const WIDTH_CLASSES: Record<SheetSize, string> = {
	sm: "w-[20rem] max-w-[90vw] h-dvh",
	md: "w-[24rem] max-w-[90vw] h-dvh",
	lg: "w-[32rem] max-w-[90vw] h-dvh",
};
const HEIGHT_CLASSES: Record<SheetSize, string> = {
	sm: "h-[14rem] max-h-[85vh] w-full",
	md: "h-[18rem] max-h-[85vh] w-full",
	lg: "h-[24rem] max-h-[85vh] w-full",
};

export const Sheet = forwardRef<HTMLDivElement, SheetProps>(function Sheet(
	{
		open: openProp,
		onOpenChange,
		side = "right",
		title,
		description,
		dismissible = true,
		size = "md",
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

	// One seed per instance, suffixed for title/description — SSR-stable,
	// same approach the source settled on with `$props.id()`.
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

	const presence = usePresence(open, {
		// The two halves of the focus handshake, at the two moments the
		// source puts them: `onintrostart` → rearm, `onoutrostart` →
		// returnFocusNow.
		//
		// `returnFocusNow` at the dismiss instant is the whole point: it is
		// called on EVERY close path (Escape, the scrim, the close button, a
		// caller's own `open` write). Waiting for the trap's own destroy
		// would leave a keyboard user on `<body>` for the whole length of the
		// slide-out, because the closing panel is made inert the instant the
		// exit starts.
		//
		// `rearm` is the other half. A sheet reopened DURING its exit
		// reverses instead of remounting, so the trap is never re-created:
		// without this the panel would come back `aria-modal` and interactive
		// with focus left on the trigger behind it, and the eager return
		// already spent for the life of the instance.
		onEnterStart: () => trap.rearm(),
		onExitStart: () => trap.returnFocusNow(),
	});

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

	// Convention C-2: composed ABOVE the conditional below. `side` rides in
	// through the params factory, read at the instant a leg starts.
	const panelRef = useComposedRefs(
		setPanelNode,
		forwardedRef,
		presence.register("panel", edgeSlide, (entering) => ({ side, entering }))
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

	const isHorizontal = side === "left" || side === "right";
	const dimensionClasses = isHorizontal ? WIDTH_CLASSES[size] : HEIGHT_CLASSES[size];

	const panelClasses = cn(
		"ft-sheet-panel bg-popover text-popover-foreground fixed z-50 flex flex-col gap-4 p-4 shadow-2xl",
		POSITION_CLASSES[side],
		dimensionClasses,
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
	// entrance outright.
	//
	// `data-state` is an ordinary attribute (divergence D-2) carrying
	// `surfaceState`'s TWO values (convention C-5); `inert` is not written by
	// hand, because `usePresence` sets it on every registered node for the
	// whole exit. `data-side` drives POSITION_CLASSES semantics for
	// consumers, not just the keyframes the source once selected with it.
	return (
		<Portal>
			{presence.mounted ? (
				<>
					<div
						ref={scrimRef}
						className="ft-sheet-scrim fixed inset-0 z-50 bg-black/60"
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
						data-side={side}
					>
						{title || dismissible ? (
							<div className="ft-sheet-header flex items-start justify-between gap-4">
								{title ? (
									<h2 id={titleId} className="text-[15px] font-semibold">
										{title}
									</h2>
								) : null}
								{dismissible ? (
									<button
										type="button"
										className="ft-sheet-close text-muted-foreground hover:text-foreground cursor-pointer text-[13px] leading-none"
										aria-label="Close"
										onClick={close}
									>
										✕
									</button>
								) : null}
							</div>
						) : null}
						{description ? (
							<p
								id={descriptionId}
								className="text-muted-foreground text-[12.5px] leading-relaxed"
							>
								{description}
							</p>
						) : null}
						<div className="ft-sheet-body flex flex-1 flex-col gap-3 overflow-y-auto">
							{children}
						</div>
						{footer ? (
							<div className="ft-sheet-footer flex justify-end gap-2">{footer}</div>
						) : null}
					</div>
				</>
			) : null}
		</Portal>
	);
});

Sheet.displayName = "Sheet";
