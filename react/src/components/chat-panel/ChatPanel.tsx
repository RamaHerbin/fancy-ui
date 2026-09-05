import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { scrollToBottom, useAutoscroll } from "../../internals/use-autoscroll.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./chat-panel.css";

/**
 * Props for ChatPanel
 */
export interface ChatPanelProps {
	/** Whether a reply is still arriving. Pins the scroll region to its bottom while true. */
	streaming?: boolean;
	/** Renders `emptyState` in place of `children` — a conversation with no turns yet. */
	empty?: boolean;
	/** Label on the pill that appears once the reader scrolls away from the bottom. */
	returnLabel?: string;
	/** Accessible name for the panel as a whole. */
	label?: string;
	/** Sticky top region: a title, a model name, a close button. */
	header?: ReactNode;
	/** The message stream, filling the scroll region. */
	children?: ReactNode;
	/** Sticky bottom region — where `Composer` belongs. */
	composer?: ReactNode;
	/** Rendered instead of `children` while `empty` — where `ChatEmptyState` belongs. */
	emptyState?: ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the press cue through the sound controller when the
	 * jump-to-latest pill is activated. Off by default; only audible
	 * once the user has enabled sound.
	 */
	sound?: boolean;
}

/** How close to the bottom (px) still counts as pinned — the autoscroll hook's own default. */
const BOTTOM_THRESHOLD = 40;

export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(function ChatPanel(
	{
		streaming = false,
		empty = false,
		returnLabel = "Jump to latest",
		label = "Conversation",
		header,
		children,
		composer,
		emptyState,
		className,
		sound = false,
	},
	ref
) {
	const [scrollEl, scrollRef] = useElementRef<HTMLDivElement>();
	// The transcript itself. The scroll region has a fixed height, so it never
	// resizes; its content is what grows when an image lands or a font swaps in.
	const [contentEl, contentRef] = useElementRef<HTMLDivElement>();

	// Content that fits its container counts as pinned, so the pill starts hidden
	// and the first sync corrects it if the transcript is already taller.
	const [stuck, setStuck] = useState(true);

	/**
	 * Whether the reader has taken the scrollbar over. Until they have, the panel
	 * still counts as opening, and every batch of arriving content lands it at the
	 * latest turn — a transcript that renders a frame after mount would otherwise
	 * open at the top of a conversation nobody asked to re-read.
	 */
	const touched = useRef(false);
	/** Suppresses the scroll event our own snap is about to produce. */
	const selfScroll = useRef(false);
	/** Batches a burst of mutations into one read of the geometry. */
	const frame = useRef<number | null>(null);
	/** The observer callback outlives any single render; it reads `empty` here. */
	const emptyLive = useLiveRef(empty);

	const playCue = useSoundCue(sound);

	/**
	 * The pill's visibility is tracked here rather than through the autoscroll
	 * hook's `onStickChange`, because the hook releases every listener the moment
	 * `enabled` goes false — which is most of the time, since it is only enabled
	 * while a reply streams. A reader scrolling up between replies would
	 * otherwise never be offered the way back.
	 */
	const syncStuck = useCallback((): void => {
		const el = scrollEl;
		if (!el) return;
		setStuck(el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD);
	}, [scrollEl]);

	/**
	 * Every scroll the panel performs on its own behalf goes through here, so the
	 * scroll event it produces is not mistaken for the reader reaching for the
	 * scrollbar. One frame is enough to tell the two apart: a scroll event is
	 * delivered before the next frame's callbacks run. The guard is only armed if
	 * the scrollbar actually moved — a panel that was already at its bottom edge
	 * emits no event to suppress, and suppressing nothing would swallow the
	 * reader's next real scroll instead.
	 */
	const snap = useCallback((el: HTMLElement, behavior: ScrollBehavior): void => {
		const before = el.scrollTop;
		scrollToBottom(el, behavior);
		if (el.scrollTop === before) return;
		selfScroll.current = true;
		requestAnimationFrame(() => {
			selfScroll.current = false;
		});
	}, []);

	function handleScroll(): void {
		if (!selfScroll.current) touched.current = true;
		syncStuck();
	}

	/**
	 * Content growing under a scrollbar that never moved fires no scroll event, so
	 * without this the pill would stay hidden through an entire reply arriving
	 * below a reader who had scrolled up — and a transcript rendered after mount
	 * would leave the panel at the top of the thread.
	 */
	const handleMutation = useCallback((): void => {
		if (frame.current !== null) return;
		frame.current = requestAnimationFrame(() => {
			frame.current = null;
			const el = scrollEl;
			if (!el) return;
			if (!touched.current && !emptyLive.current) snap(el, "instant");
			syncStuck();
		});
	}, [scrollEl, emptyLive, snap, syncStuck]);

	function jumpToLatest(): void {
		const el = scrollEl;
		if (!el) return;
		playCue("press");
		// The pill is about to disappear under the pointer, which would leave the
		// keyboard with nothing focused. Handing focus to the scroll region keeps
		// the reader where they were and lets them carry on with the arrow keys.
		el.focus({ preventScroll: true });
		snap(el, prefersReducedMotion() ? "instant" : "smooth");
	}

	useAutoscroll(scrollEl, { enabled: streaming });

	// A conversation opens at its latest turn, the way every conversation does.
	// Instant rather than smooth: there is no journey to show on first paint, and
	// a smooth scroll still in flight reads as "not at the bottom" to the stick
	// tracking above. Keyed on the node and nothing else, so it runs once.
	useIsomorphicLayoutEffect(() => {
		const el = scrollEl;
		if (!el) return;
		snap(el, "instant");
		syncStuck();
	}, [scrollEl, snap, syncStuck]);

	// The empty state taking the transcript's place, or a reply starting to grow
	// it, both change what the region holds without moving its scrollbar.
	// `syncStuck` writes `stuck` and never reads it, so this cannot feed itself.
	useEffect(() => {
		syncStuck();
	}, [streaming, empty, syncStuck]);

	useEffect(() => {
		const el = scrollEl;
		if (!el) return;
		const growth = new MutationObserver(handleMutation);
		growth.observe(el, { childList: true, subtree: true, characterData: true });

		// A mutation is not the only way the transcript gets taller: an image
		// finishing its download, a web font swapping in, or a block expanding
		// under CSS changes the height with the DOM untouched, and the pill would
		// go on claiming the reader is at the end.
		let resize: ResizeObserver | null = null;
		if (contentEl && typeof ResizeObserver !== "undefined") {
			resize = new ResizeObserver(handleMutation);
			resize.observe(contentEl);
		}

		return () => {
			growth.disconnect();
			resize?.disconnect();
			if (frame.current !== null) cancelAnimationFrame(frame.current);
			frame.current = null;
		};
	}, [scrollEl, contentEl, handleMutation]);

	return (
		<div
			ref={ref}
			className={cn(
				"ft-panel bg-card text-card-foreground flex h-full flex-col overflow-hidden rounded-xl border",
				className
			)}
			role="region"
			aria-label={label}
			data-streaming={streaming ? "" : undefined}
			data-empty={empty ? "" : undefined}
		>
			{header ? (
				/*
				 * Sticky without `position: sticky`: the shell is a flex column whose
				 * middle row is the only one allowed to grow, so the two ends simply
				 * never scroll.
				 */
				<div className="ft-panel-header border-border flex-none border-b">{header}</div>
			) : null}

			<div className="ft-panel-viewport relative min-h-0 flex-1">
				{/*
				 * `min-h-0` on the wrapper is what lets this row shrink below its
				 * content: without it a flex item refuses to go under its intrinsic
				 * height and the whole panel grows instead of scrolling. The region is
				 * focusable because a keyboard has no other way to scroll it, and its
				 * ring is drawn inset — the region fills the wrapper edge to edge, so a
				 * ring outside its border box would be clipped away by the shell's
				 * `overflow-hidden`. It carries no role of its own: the panel around it
				 * is already the named `Conversation` region, and a `log` here would
				 * have a screen reader read every streamed token back out loud.
				 */}
				<div
					ref={scrollRef}
					className="ft-panel-scroll focus-visible:ring-ring h-full overflow-y-auto focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
					tabIndex={0}
					onScroll={handleScroll}
				>
					{/*
					 * A stable wrapper around whichever branch renders, so there is one
					 * element to watch for height changes whether the panel is empty or
					 * not.
					 */}
					<div ref={contentRef}>{empty ? emptyState : children}</div>
				</div>

				{!stuck ? (
					<button
						type="button"
						className="ft-panel-return bg-card text-foreground border-border hover:bg-muted focus-visible:ring-ring absolute inset-x-0 z-10 mx-auto flex w-fit cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
						onClick={jumpToLatest}
					>
						<svg
							className="size-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M12 5v14" />
							<path d="m19 12-7 7-7-7" />
						</svg>
						{returnLabel}
					</button>
				) : null}
			</div>

			{composer ? (
				<div className="ft-panel-composer border-border bg-card flex-none border-t">
					{composer}
				</div>
			) : null}
		</div>
	);
});
