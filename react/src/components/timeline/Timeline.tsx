import { useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { rafThrottle } from "../../internals/motion/raf.js";

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
}

/**
 * The two declarations the scroll position actually moves. Written straight to
 * the node instead of through state: a scroll can fire once per frame, and a
 * re-render would rebuild every item row and re-invoke the `content` render
 * prop for the whole list to move a 2px gradient line.
 */
function writeProgressLine(line: HTMLElement | null, progress: number, height: number): void {
	if (!line) return;
	line.style.height = `${progress * height}px`;
	line.style.opacity = String(Math.min(progress / 0.1, 1));
}

export function Timeline({ items = [], title, description, className, content }: TimelineProps) {
	const timelineRef = useRef<HTMLDivElement | null>(null);
	const progressRef = useRef<HTMLDivElement | null>(null);
	// Measured height and scroll fraction live in refs so the progress line can
	// be written imperatively; `timelineHeight` mirrors the measurement into
	// state only because the background rail's height is part of the render
	// output, and it moves at resize frequency, not per frame.
	const heightRef = useRef(0);
	const progressValueRef = useRef(0);
	const [timelineHeight, setTimelineHeight] = useState(0);

	// Layout effect: the measurement and the first progress write are
	// paint-visible geometry. In a passive effect the rail and the progress
	// line would paint at 0px for a frame and then pop to size.
	useIsomorphicLayoutEffect(() => {
		function measure(el: HTMLDivElement) {
			heightRef.current = el.getBoundingClientRect().height;
			setTimelineHeight(heightRef.current);
		}

		function updateProgress() {
			const el = timelineRef.current;
			if (!el) return;

			const rect = el.getBoundingClientRect();
			const viewportHeight = window.innerHeight;

			// Start tracking when top of timeline reaches 10% from top of viewport
			const startOffset = viewportHeight * 0.1;
			// End tracking when bottom of timeline reaches 50% of viewport
			const endOffset = viewportHeight * 0.5;

			const start = rect.top - startOffset;
			const end = rect.bottom - endOffset;
			const total = end - start;

			if (total <= 0) {
				progressValueRef.current = 0;
			} else {
				const progress = -start / total;
				progressValueRef.current = Math.max(0, Math.min(1, progress));
			}

			writeProgressLine(progressRef.current, progressValueRef.current, heightRef.current);
		}

		const el = timelineRef.current;
		if (el) {
			measure(el);
		}

		const resizeObserver = new ResizeObserver(() => {
			if (timelineRef.current) {
				measure(timelineRef.current);
				// The progress line's height is a fraction OF the measured
				// height, so a resize moves it too — the same recompute the
				// Svelte source gets for free from its derived value.
				writeProgressLine(progressRef.current, progressValueRef.current, heightRef.current);
			}
		});

		if (el) {
			resizeObserver.observe(el);
		}

		const onScroll = rafThrottle(updateProgress);
		window.addEventListener("scroll", onScroll, { passive: true });
		updateProgress();

		return () => {
			onScroll.cancel();
			resizeObserver.disconnect();
			window.removeEventListener("scroll", onScroll);
		};
	}, []);

	return (
		<div className={cn("w-full font-sans md:px-10", className)}>
			{(title || description) && (
				<div className="mx-auto max-w-7xl px-4 py-20 md:px-8 lg:px-10">
					{title && <h2 className="text-foreground mb-4 max-w-4xl text-lg md:text-4xl">{title}</h2>}
					{description && (
						<p className="text-muted-foreground max-w-sm text-sm md:text-base">{description}</p>
					)}
				</div>
			)}

			<div ref={timelineRef} className="relative z-0 mx-auto max-w-7xl pb-20">
				{items.map((item, index) => (
					<div key={`${item.id}-${index}`} className="flex justify-start pt-10 md:gap-10 md:pt-40">
						{/* Sticky label */}
						<div className="sticky top-40 z-40 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm">
							<div className="bg-background absolute left-3 flex size-10 items-center justify-center rounded-full md:left-3">
								<div className="size-4 rounded-full border border-neutral-300 bg-neutral-200 p-2 dark:border-neutral-700 dark:bg-neutral-800" />
							</div>
							<h3 className="hidden text-xl font-bold text-neutral-500 md:block md:pl-20 md:text-5xl dark:text-neutral-500">
								{item.label}
							</h3>
						</div>

						{/* Item content */}
						<div className="w-full pr-4 pl-20 md:pl-4">{content ? content(item) : null}</div>
					</div>
				))}

				{/* Background line */}
				<div
					style={{ height: `${timelineHeight}px` }}
					className="absolute top-0 left-8 w-[2px] overflow-hidden bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-0% via-neutral-200 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] md:left-8 dark:via-neutral-700"
				>
					{/* Animated progress line */}
					<div
						ref={progressRef}
						style={{ height: "0px", opacity: 0 }}
						className="absolute inset-x-0 top-0 w-[2px] rounded-full bg-gradient-to-t from-purple-500 from-0% via-blue-500 via-10% to-transparent"
					></div>
				</div>
			</div>
		</div>
	);
}
