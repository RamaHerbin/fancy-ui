import { memo, useCallback, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { rafThrottle } from "../../internals/motion/raf.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import "./timeline.css";

export interface TimelineItem {
	id: string;
	label: string;
}

export interface TimelineProps {
	/** Timeline entries */
	items?: TimelineItem[];
	/** Heading text */
	title?: string;
	/** Subheading text */
	description?: string;
	/** Additional CSS classes for the outer wrapper */
	className?: string;
	/** Content render prop, called for each item */
	content?: (item: TimelineItem) => ReactNode;
	/**
	 * Colour of the travelling head, its trail and the lit dots. Any CSS
	 * colour. Unset, it follows the theme's `--primary` token and falls back
	 * to a soft violet when no theme is present. Also settable from CSS via
	 * `--timeline-accent`.
	 */
	accent?: string;
}

/** Half of the 40px dot box: the dot's centre sits this far below its row's padding edge. */
const DOT_HALF = 20;
/** The head stops this far above the bottom of the track, inside the rail's fade-out. */
const END_PAD = 56;
/** Sticky offset of the label column (`top-40`), used until the real value is measured. */
const STICKY_FALLBACK = 160;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * One row's content, memoised on (render prop, item): a dot lighting up
 * re-renders the rows to flip `data-state` / `data-lit`, and that must not
 * re-invoke the consumer's `content` render prop for the whole list.
 */
const TimelineContent = memo(function TimelineContent({
	content,
	item,
}: {
	content?: (item: TimelineItem) => ReactNode;
	item: TimelineItem;
}) {
	return <>{content ? content(item) : null}</>;
});

export function Timeline({
	items = [],
	title,
	description,
	className,
	content,
	accent,
}: TimelineProps) {
	const reduced = useReducedMotion();

	const rootRef = useRef<HTMLDivElement | null>(null);
	const timelineRef = useRef<HTMLDivElement | null>(null);
	const rowEls = useRef<(HTMLDivElement | null)[]>([]);

	/** Each dot's resting offset from the top of the track. */
	const dotOffsets = useRef<number[]>([]);
	/** Viewport y of the reading line: where a docked (sticky) dot's centre sits. */
	const readingLine = useRef(STICKY_FALLBACK + DOT_HALF);
	/**
	 * Where the head sits, in px from the top of the track. Written straight to
	 * the root as `--tl-progress` instead of through state: scroll fires once
	 * per frame, and a re-render per frame would rebuild every row to move one
	 * custom property. State only changes when a dot is crossed.
	 */
	const head = useRef(0);
	const heightRef = useRef(0);

	const [timelineHeight, setTimelineHeight] = useState(0);
	const [ready, setReady] = useState(false);
	/** Index of the row whose dot the head has most recently reached, or -1. */
	const [activeIndex, setActiveIndex] = useState(-1);

	/** Reads the track's position and places the head on the reading line —
	 * the line a sticky dot docks on. */
	const place = useCallback(() => {
		const track = timelineRef.current;
		if (!track) return;
		const rect = track.getBoundingClientRect();
		const offsets = dotOffsets.current;
		const start = offsets[0] ?? 0;
		const end = Math.max(start, heightRef.current - END_PAD);
		const raw = readingLine.current - rect.top;
		const next = Math.min(end, Math.max(start, raw));
		head.current = next;
		rootRef.current?.style.setProperty("--tl-progress", `${next}px`);

		let idx = -1;
		for (let i = 0; i < offsets.length; i++) {
			if ((offsets[i] as number) <= next + 0.5) idx = i;
		}
		setActiveIndex(idx);
		setReady(true);
	}, []);

	/** Layout reads that only change on resize: track height, each dot's
	 * resting offset (its unstuck position), and the sticky offset. */
	const measure = useCallback(() => {
		const track = timelineRef.current;
		if (!track) return;
		heightRef.current = track.offsetHeight;
		setTimelineHeight(heightRef.current);
		const next: number[] = [];
		let firstDotCentre = DOT_HALF;
		for (const row of rowEls.current) {
			if (!row) continue;
			const padTop = parseFloat(getComputedStyle(row).paddingTop) || 0;
			// The dot box is positioned inside the sticky label (its offsetParent),
			// which rests at the row's padding edge — so this is the unstuck centre.
			const box = row.querySelector<HTMLElement>("[data-timeline-dot-box]");
			const centre = box && box.offsetHeight ? box.offsetTop + box.offsetHeight / 2 : DOT_HALF;
			if (next.length === 0) firstDotCentre = centre;
			next.push(row.offsetTop + padTop + centre);
		}
		dotOffsets.current = next;
		const label = track.querySelector<HTMLElement>("[data-timeline-label]");
		const top = label ? parseFloat(getComputedStyle(label).top) : NaN;
		readingLine.current = (Number.isFinite(top) ? top : STICKY_FALLBACK) + firstDotCentre;
		place();
	}, [place]);

	// Layout effect: the first measurement is paint-visible geometry (rail
	// height, head position, the lit first dot). In a passive effect they would
	// paint at 0 for a frame and then pop into place.
	useIsomorphicLayoutEffect(() => {
		const onScroll = rafThrottle(place);
		const onResize = rafThrottle(measure);

		const resizeObserver = new ResizeObserver(() => onResize());
		if (timelineRef.current) resizeObserver.observe(timelineRef.current);
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onResize, { passive: true });
		measure();

		return () => {
			onScroll.cancel();
			onResize.cancel();
			resizeObserver.disconnect();
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onResize);
		};
	}, [place, measure]);

	// Items added or removed after mount: re-measure once the new rows exist.
	const itemCount = items.length;
	const measuredCount = useRef(itemCount);
	useIsomorphicLayoutEffect(() => {
		if (measuredCount.current === itemCount) return;
		measuredCount.current = itemCount;
		measure();
	}, [itemCount, measure]);

	const rowState = (index: number): "past" | "active" | "upcoming" => {
		if (index === activeIndex) return "active";
		return index < activeIndex ? "past" : "upcoming";
	};

	// `--tl-progress` is owned by `place()` between renders; a render re-states
	// the latest value so React never writes a stale one back over it.
	const rootStyle = {
		"--timeline-accent": accent,
		"--tl-progress": `${head.current}px`,
	} as CSSProperties;

	return (
		<div
			ref={rootRef}
			className={cn("tl-root w-full font-sans md:px-10", className)}
			style={rootStyle}
			data-motion={reduced ? "reduced" : "full"}
		>
			{(title || description) && (
				<div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16 lg:px-10">
					{title && (
						<h2 className="text-foreground mb-3 max-w-4xl text-lg font-medium tracking-tight text-balance md:text-4xl">
							{title}
						</h2>
					)}
					{description && (
						<p className="text-muted-foreground max-w-sm text-sm md:text-base">{description}</p>
					)}
				</div>
			)}

			<div
				ref={timelineRef}
				className="relative z-0 mx-auto max-w-7xl pb-20"
				data-timeline-track=""
			>
				{items.map((item, index) => (
					<div
						key={`${item.id}-${index}`}
						ref={(el) => {
							rowEls.current[index] = el;
						}}
						className="tl-row flex justify-start pt-10 md:gap-10 md:pt-32"
						data-timeline-row=""
						data-state={rowState(index)}
					>
						{/* Sticky label */}
						<div
							className="tl-label sticky top-40 z-40 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm"
							data-timeline-label=""
						>
							<div
								className="absolute left-3 flex size-10 items-center justify-center md:left-3"
								data-timeline-dot-box=""
								aria-hidden="true"
							>
								<span className="tl-dot" data-timeline-dot="" data-lit={index <= activeIndex}>
									<span className="tl-dot-flare"></span>
									<span className="tl-dot-core"></span>
								</span>
							</div>
							<div className="tl-label-text relative hidden md:block md:pl-20">
								<span className="tl-index" aria-hidden="true">
									{pad(index + 1)}
								</span>
								<h3 className="tl-heading text-xl font-semibold tracking-tight md:text-4xl">
									{item.label}
								</h3>
							</div>
						</div>

						{/* Item content */}
						<div className="tl-content w-full pr-4 pl-20 md:pl-4">
							<TimelineContent content={content} item={item} />
						</div>
					</div>
				))}

				{/* Rail: hairline + the lit trail behind the head, faded at both ends */}
				<div className="tl-rail" style={{ height: `${timelineHeight}px` }} aria-hidden="true">
					<div className="tl-rail-line"></div>
					<div className="tl-trail"></div>
				</div>

				{/* Travelling head (full motion only) */}
				{!reduced && items.length > 0 && (
					<div className="tl-head" data-timeline-head="" data-ready={ready} aria-hidden="true">
						<span className="tl-head-streak"></span>
						<span className="tl-head-halo"></span>
						<span className="tl-head-core"></span>
					</div>
				)}
			</div>
		</div>
	);
}
