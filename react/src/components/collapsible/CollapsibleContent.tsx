import { forwardRef, useContext, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, TransitionEvent } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useInertAttribute } from "../../internals/dom/use-inert-attribute.js";
import { COLLAPSIBLE_KEY } from "./types.js";
import { isCollapseEnd, prefersReducedMotionNow, settleDelayMs } from "./collapsible-core.js";

interface CollapsibleContentOwnProps {
	/**
	 * Keeps the children mounted while the content is closed. On by default: a
	 * closed panel stays in the DOM (inert and hidden) so server-rendered
	 * markup, find-in-page and form state survive. Pass `false` to unmount the
	 * children once the collapse has finished and mount them again on open, for
	 * content that should not run while closed (an iframe, a video).
	 */
	forceMount?: boolean;
	/** The content. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the inner body so padding collapses with the panel. */
	className?: string;
}

/**
 * Native `<div>` attributes and listeners are forwarded to the region; `id`,
 * `data-state`, `inert` and `visibility` stay the component's.
 */
export interface CollapsibleContentProps
	extends
		Omit<ComponentPropsWithoutRef<"div">, keyof CollapsibleContentOwnProps>,
		CollapsibleContentOwnProps {}

/**
 * The region a `CollapsibleTrigger` expands. It animates `grid-template-rows`
 * between `0fr` and `1fr`, so nothing is measured and an interrupted toggle
 * simply reverses; once a close has finished it goes inert and hidden. The
 * element arrives through the ref channel rather than a `ref` prop, per
 * PORTING.md.
 */
export const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
	({ forceMount = true, children, className, onTransitionEnd, style, ...rest }, forwardedRef) => {
		// Undefined outside a Collapsible: nothing is ever open, so the content
		// stays collapsed, the same graceful degradation as the trigger.
		const context = useContext(COLLAPSIBLE_KEY);
		const open = context?.open ?? false;

		// "Closed and finished collapsing". Starts true for a panel that is born
		// closed, so a server-rendered closed panel is already hidden. It is only
		// ever set from the settle path below and cleared the moment the panel
		// opens, which is what makes a double toggle safe: a close that gets
		// interrupted never reaches its own settle.
		const [settled, setSettled] = useState(!open);
		const settledRef = useRef(settled);
		const hidden = settled && !open;

		const nodeRef = useRef<HTMLDivElement | null>(null);
		const inertRef = useInertAttribute<HTMLDivElement>(!open);
		const setRef = useComposedRefs(forwardedRef, nodeRef, inertRef);

		const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

		function clearTimer() {
			if (timerRef.current !== undefined) clearTimeout(timerRef.current);
			timerRef.current = undefined;
		}

		function settle(value: boolean) {
			settledRef.current = value;
			setSettled(value);
		}

		// Reacts to `open` only. A close settles on `transitionend`; the deadline
		// is the net for the cases where that event never comes (reduced motion,
		// no declared duration, a panel inside a hidden ancestor).
		useEffect(() => {
			clearTimer();
			if (open) {
				if (settledRef.current) settle(false);
				return clearTimer;
			}
			if (settledRef.current) return clearTimer;
			const node = nodeRef.current;
			const delay = settleDelayMs(node ? getComputedStyle(node) : null, prefersReducedMotionNow());
			if (delay === 0) {
				settle(true);
				return clearTimer;
			}
			timerRef.current = setTimeout(() => {
				timerRef.current = undefined;
				settle(true);
			}, delay);
			return clearTimer;
		}, [open]);

		function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
			if (isCollapseEnd(event) && !open) {
				clearTimer();
				settle(true);
			}
			onTransitionEnd?.(event);
		}

		return (
			<div
				{...rest}
				ref={setRef}
				id={context?.contentId ?? rest.id}
				className="ft-collapsible-content grid grid-rows-[0fr] transition-[grid-template-rows] duration-[var(--ft-collapsible-duration,240ms)] ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none"
				data-state={open ? "open" : "closed"}
				style={hidden ? { ...style, visibility: "hidden" } : style}
				onTransitionEnd={handleTransitionEnd}
			>
				<div className="min-h-0 overflow-hidden">
					<div className={cn("ft-collapsible-body", className)}>
						{forceMount || !hidden ? children : null}
					</div>
				</div>
			</div>
		);
	}
);
CollapsibleContent.displayName = "CollapsibleContent";
