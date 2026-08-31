import { forwardRef, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { scrollToBottom, useAutoscroll } from "../../internals/use-autoscroll.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import "./scroll-anchor.css";

/**
 * Props for ScrollAnchor
 */
export interface ScrollAnchorProps {
	/**
	 * Whether the region pins itself to the bottom as content arrives. Bind it
	 * to whatever says a response is still streaming; `false` leaves an ordinary
	 * scroll box that never moves on its own.
	 */
	active?: boolean;
	/** How close to the bottom (px) still counts as pinned. */
	bottomThreshold?: number;
	/** Label on the floating return button. */
	returnLabel?: string;
	/** Whether the floating return button appears once the reader scrolls away. */
	showReturn?: boolean;
	/** Height cap on the scrolling region — any CSS length. */
	maxHeight?: string;
	/** Called when the region pins itself to the bottom or lets go, never on every scroll. */
	onStickChange?: (stuck: boolean) => void;
	/** The scrolling content */
	children: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const ScrollAnchor = forwardRef<HTMLDivElement, ScrollAnchorProps>(function ScrollAnchor(
	{
		active = true,
		bottomThreshold = 40,
		returnLabel = "Jump to latest",
		showReturn = true,
		maxHeight = "100%",
		onStickChange,
		children,
		className,
	},
	ref
) {
	const [region, regionRef] = useElementRef<HTMLDivElement>();
	// Content that fits, or a container already at its bottom edge, counts as
	// pinned — the same opening assumption the autoscroll core makes.
	const [stuck, setStuck] = useState(true);

	/**
	 * The autoscroll core is the one that decides; this only mirrors its answer
	 * so the button can be rendered from it, and passes the same answer on
	 * untouched.
	 */
	function handleStick(next: boolean) {
		setStuck(next);
		onStickChange?.(next);
	}

	useAutoscroll(region, {
		enabled: active,
		bottomThreshold,
		onStickChange: handleStick,
	});

	/*
	 * The button belongs to the pinning behaviour, so it goes when the pinning
	 * does: with `active` false the core has disconnected its scroll listener
	 * and would never be able to tell us the reader had come back down, leaving a
	 * pill on screen that nothing could ever dismiss.
	 */
	const showPill = showReturn && active && !stuck;

	// The core reads the container once when it is attached and then only speaks
	// up on a transition, so a region that mounts already overflowing — a
	// transcript rendered in one go — would otherwise show no way down to the end.
	// Reading the same geometry here keeps the two in step from the first frame.
	// `bottomThreshold` is in the deps on purpose: it changes the answer with
	// nothing having scrolled, so the pill has to be recomputed when it does.
	// `stuck` is only written here, never read, so this cannot re-trigger itself.
	useEffect(() => {
		if (!region) return;
		setStuck(region.scrollHeight - region.scrollTop - region.clientHeight <= bottomThreshold);
	}, [region, bottomThreshold]);

	function jump() {
		if (!region) return;
		// The button is about to unmount under the pointer, which would drop the
		// keyboard back to the document body. Focus goes to the region it just
		// scrolled, so the arrow keys carry on where the button left off.
		region.focus({ preventScroll: true });
		// A journey the reader asked for is worth showing — unless they have asked
		// for no journeys at all, in which case they simply arrive.
		scrollToBottom(region, prefersReducedMotion() ? "instant" : "smooth");
	}

	return (
		/*
		 * `h-full` so the region's default `max-height: 100%` has something
		 * definite to resolve against: a percentage against a parent of
		 * `height: auto` computes to no cap at all. With no bounded ancestor this
		 * still resolves to `auto`, so nothing changes for a wrapper that was
		 * sizing itself.
		 */
		<div ref={ref} className={cn("ft-scrollanchor relative h-full", className)}>
			{/*
				`tabIndex={-1}` is there for the return button alone: the region takes
				focus when the button that had it unmounts, and stays out of the tab
				order the rest of the time, so nothing about a consumer's tab sequence
				changes. The ring is drawn inset because the region fills the root edge
				to edge.
			*/}
			<div
				ref={regionRef}
				className="ft-scrollanchor-region focus-visible:ring-ring overflow-y-auto overscroll-y-contain rounded-[inherit] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
				style={{ maxHeight }}
				tabIndex={-1}
			>
				{children}
			</div>

			{showPill && (
				<button
					type="button"
					className="ft-scrollanchor-return border-border bg-background text-foreground focus-visible:ring-ring cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-md focus-visible:ring-2 focus-visible:outline-none"
					onClick={jump}
				>
					<svg
						className="size-3.5 flex-none"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M12 5v14" />
						<path d="m19 12-7 7-7-7" />
					</svg>
					{returnLabel}
				</button>
			)}
		</div>
	);
});
