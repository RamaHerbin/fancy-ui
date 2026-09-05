import { forwardRef } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useFocusTrap } from "../../internals/focus-trap.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { usePopoverContext } from "./types.js";

export interface PopoverContentProps {
	/** The panel's content, forwarded straight from `Popover`'s own `children`. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the panel. */
	className?: string;
}

/**
 * The portalled, anchored panel.
 *
 * No `role` here on purpose. A popover is a disclosure, not a dialog — it
 * has no title to hang `aria-labelledby` off (the `trigger` node is whatever
 * the caller passed, not a documented "title"), and `role="dialog"` without
 * an accessible name is worse than no role at all. Reachability comes from
 * `useFocusTrap` (moves focus in, and returns it to the trigger the instant
 * the panel is dismissed) and `useDismissable`, not from a landmark role.
 *
 * The source declares `ref = $bindable(null)`, so the panel element arrives
 * through the ref channel rather than a prop.
 */
export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
	function PopoverContent({ children, className }, forwardedRef) {
		// `Popover` only ever mounts this component under its own provider, so
		// the context is always present by the time this runs — there is no
		// standalone-usage fallback to design for.
		const ctx = usePopoverContext();

		// The NODE, not a ref (convention C-1): the panel is created by
		// `presence.mounted`, so a `useRef` read inside a `[]`-deps effect
		// would still be null when the trap, position and dismiss effects fire
		// and none of them would ever arm — silently.
		const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

		// The placement as ACTUALLY resolved — the requested side and align
		// until `computePosition` flips or clamps it away from a viewport edge.
		// Seeded with the REQUESTED values by the hook itself rather than a
		// hardcoded "bottom"/"center", so a panel that never flips reads the
		// right growth origin without depending on whether the first placement
		// has run yet, and the common case never shows a one-frame origin jump.
		//
		// `resolvedAlign` differs from the requested alignment whenever
		// clamping slid the panel along the cross axis — near a viewport edge
		// the requested corner is no longer the one touching the anchor, and an
		// entrance grown from it would expand from the far corner instead.
		//
		// DECLARED BEFORE `useFocusTrap`, and that order is load-bearing: both
		// arm in layout effects in the commit the panel node lands in, and
		// layout effects run in hook-declaration order. Positioning first means
		// the trap's `.focus()` lands on a panel that already has coordinates.
		// The other way round it would focus a `position: static` node sitting
		// at the end of `document.body`, and the browser would scroll the page
		// down to it — a jump that survives the switch to `position: fixed` one
		// effect later. The source gets this from its action order
		// (`use:anchorPosition` before `use:focusTrap`).
		const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
			anchor: () => ctx.triggerRef,
			side: ctx.side,
			align: ctx.align,
			offset: ctx.offset,
		});

		// Returns the two functions the source hands out through `onActivate`
		// (divergence D-3): the eager return, and the re-arm. Two module-level
		// `let`s, two handler functions and an `onActivate` closure collapse to
		// this one line.
		const trap = useFocusTrap(panel, { returnFocus: true });

		const presence = usePresence(ctx.open, {
			// The two halves of the focus handshake, at the two moments the
			// source puts them: `onintrostart` → rearm, `onoutrostart` →
			// returnFocusNow.
			//
			// `returnFocusNow` at the dismiss instant is the whole point:
			// waiting for the trap's own `destroy()` would strand a keyboard
			// user on `<body>` for the whole length of the fade, because the
			// panel is marked `inert` the instant the exit starts.
			//
			// `rearm` is the other half. A popover reopened DURING its fade
			// reverses the exit instead of remounting, so the trap is never
			// re-created: without this the panel would come back interactive
			// with focus left on the trigger behind it, Tab walking the page
			// rather than the panel, and the eager return already spent for the
			// life of the instance.
			onEnterStart: () => trap.rearm(),
			onExitStart: () => trap.returnFocusNow(),
		});

		// `active: ctx.open` — a plain boolean where the source needed a getter
		// (divergence D-6). The layer stays ON the stack for its whole exit and
		// stops being TOP of it the instant `open` flips, so a second Escape
		// during the fade is neither answered again nor swallowed on its way to
		// whatever sits underneath.
		useDismissable(panel, {
			onDismiss: ctx.close,
			escape: ctx.dismissible,
			outsideClick: ctx.dismissible,
			exclude: () => [ctx.triggerRef],
			active: ctx.open,
		});

		// Convention C-2: composed ABOVE the conditional below. Calling this
		// inside the JSX branch would be a conditional hook and would throw the
		// first time `mounted` flips.
		//
		// ONE bidirectional transition, never a split in/out pair: the
		// in-flight counterpart's current position is passed into the fresh
		// leg, so a panel reopened mid-exit continues from where it is instead
		// of snapping to invisible first. `entering` is what tells it which way
		// it is going, and the params are read at the instant each leg starts.
		const panelRef = useComposedRefs(
			setPanelNode,
			forwardedRef,
			presence.register(anchored, (entering) => ({ side: resolvedSide, entering }))
		);

		const classes = cn(
			"ft-popover-content flex w-max flex-col gap-[6px] rounded-[10px] border border-border bg-popover px-[14px] py-[12px] text-[12px] text-popover-foreground shadow-lg outline-none",
			className
		);

		// The `Portal` stays ABOVE the mounted gate, and the gate wraps its
		// CHILDREN. `usePortalTarget` resolves its container in a layout
		// effect, so a `Portal` that first mounts in the same commit as the
		// panel would render null on that pass — `usePresence` would then find
		// no registered leg and the entrance would be silently skipped.
		//
		// No portal-before-focus-trap ordering ceremony (divergence D-10):
		// `createPortal` commits children into the container before any effect
		// runs and refs populate before layout effects, so the node the trap
		// focuses is always connected.
		//
		// `data-state` is an ordinary attribute (divergence D-2) carrying
		// `surfaceState`'s TWO values — never `"opening"` (convention C-5).
		// `inert` is not written by hand either: `usePresence` sets it on every
		// registered node for the whole exit, which is what keeps a fading
		// panel from being clicked or tabbed into on its way out.
		//
		// `data-align` publishes the REQUESTED alignment, exactly as the source
		// does; only the transform origin follows the resolved one.
		return (
			<Portal>
				{presence.mounted ? (
					<div
						ref={panelRef}
						id={ctx.contentId}
						className={classes}
						data-state={presence.surfaceState}
						data-side={resolvedSide}
						data-align={ctx.align}
						style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
					>
						{children}
					</div>
				) : null}
			</Portal>
		);
	}
);

PopoverContent.displayName = "PopoverContent";
