import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { rafThrottle } from "../../internals/motion/raf.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import "./tracing-beam.css";

export interface TracingBeamProps {
	/** Additional CSS classes for the outer wrapper */
	className?: string;
	/** Long-form content the beam reads alongside */
	children?: ReactNode;
	/**
	 * Colour of the lamp, its trail and the lit markers. Any CSS colour.
	 * Unset, it follows the theme's `--primary` token and falls back to a
	 * soft violet when no theme is present. Also settable from CSS via
	 * `--tracing-beam-accent`.
	 */
	accent?: string;
	/**
	 * Where the reader's eye is assumed to be, as a fraction of the viewport
	 * height from the top. The lamp sits on that line, clamped to the content.
	 */
	readingLine?: number;
	/**
	 * Draw a marker on the rail for every heading (`h1`–`h4`) inside the
	 * content — or, when there is none, for every direct child. Markers light
	 * up as the lamp passes them.
	 */
	markers?: boolean;
}

/** Spring that carries the lamp: stiff enough to feel attached, loose enough to trail. */
const TENSION = 120;
const FRICTION = 22;
/** Settle threshold, in px and px/s. */
const PRECISION = 0.05;
/** Longest frame the spring integrates (a tab coming back is not a 2 s step). */
const MAX_DT = 1 / 30;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Markers the lamp has reached light up; the rest wait. */
function isLit(offset: number, head: number): boolean {
	return offset <= head + 0.5;
}

function sameFlags(a: boolean[], b: boolean[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

/**
 * TracingBeam - A reading lamp on a rail beside long-form content. The lamp
 * sits on the reader's line of sight and follows the scroll on a spring; what
 * has been read stays softly lit, and a marker per heading lights up as the
 * lamp passes it.
 */
export function TracingBeam({
	className = "",
	children,
	accent,
	readingLine = 0.38,
	markers = true,
}: TracingBeamProps) {
	const reduced = useReducedMotion();

	const rootRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);

	/** Content height, so the rail's fade and the lamp's clamp know the end. */
	const [height, setHeight] = useState(0);
	/** Marker offsets from the top of the content, in px. */
	const [ticks, setTicks] = useState<number[]>([]);
	/** One flag per marker: lit once the lamp has reached it. */
	const [lit, setLit] = useState<boolean[]>([]);
	const [ready, setReady] = useState(false);

	/**
	 * Mutable animation state. Where the lamp sits (`head`) is written straight
	 * to the root as `--tb-progress` from the frame loop instead of through
	 * state: a re-render per frame would rebuild the gutter to move one custom
	 * property. State only changes when markup does (a marker lighting up).
	 */
	const stateRef = useRef({
		head: 0,
		target: 0,
		velocity: 0,
		rafId: 0,
		lastTime: 0,
		ticks: [] as number[],
		lit: [] as boolean[],
	});

	/** Re-derives the lit flags from the current lamp position; re-renders only on a change. */
	const syncLit = useCallback(() => {
		const s = stateRef.current;
		const next = s.ticks.map((offset) => isLit(offset, s.head));
		if (sameFlags(next, s.lit)) return;
		s.lit = next;
		setLit(next);
	}, []);

	/** Writes the lamp's position to the root and lights the markers it has passed. */
	const applyHead = useCallback(() => {
		rootRef.current?.style.setProperty("--tb-progress", `${stateRef.current.head}px`);
		syncLit();
	}, [syncLit]);

	/** Reads where the content sits and sends the lamp to the reading line. */
	const place = useCallback(() => {
		const content = contentRef.current;
		if (!content) return;
		const s = stateRef.current;
		const rect = content.getBoundingClientRect();
		const line = window.innerHeight * clamp(readingLine, 0, 1);
		s.target = clamp(line - rect.top, 0, Math.max(0, rect.height));
		setReady(true);
		if (reduced) {
			cancelAnimationFrame(s.rafId);
			s.rafId = 0;
			s.velocity = 0;
			s.head = s.target;
			applyHead();
			return;
		}
		if (!s.rafId) {
			/** One spring step; schedules the next until the lamp has settled on `target`. */
			const step = (time: number) => {
				const dt = Math.min(MAX_DT, (time - s.lastTime) / 1000 || 0);
				s.lastTime = time;
				const force = TENSION * (s.target - s.head) - FRICTION * s.velocity;
				s.velocity += force * dt;
				s.head += s.velocity * dt;
				if (Math.abs(s.velocity) < PRECISION && Math.abs(s.target - s.head) < PRECISION) {
					s.head = s.target;
					s.velocity = 0;
					s.rafId = 0;
					applyHead();
					return;
				}
				applyHead();
				s.rafId = requestAnimationFrame(step);
			};
			s.lastTime = performance.now();
			s.rafId = requestAnimationFrame(step);
		}
	}, [readingLine, reduced, applyHead]);

	/** Layout reads that only change on resize: content height and marker offsets. */
	const measure = useCallback(() => {
		const content = contentRef.current;
		if (!content) return;
		const s = stateRef.current;
		const rect = content.getBoundingClientRect();
		setHeight(rect.height);
		if (markers) {
			const headings = content.querySelectorAll<HTMLElement>("h1, h2, h3, h4");
			const anchors = headings.length ? [...headings] : [...content.children];
			s.ticks = anchors
				.filter((el): el is HTMLElement => el instanceof HTMLElement)
				.map((el) => {
					const box = el.getBoundingClientRect();
					return box.top + box.height / 2 - rect.top;
				});
		} else {
			s.ticks = [];
		}
		setTicks(s.ticks);
		syncLit();
		place();
	}, [markers, place, syncLit]);

	// Layout effect: the first measurement is paint-visible geometry (rail
	// height, lamp position, the lit markers). In a passive effect they would
	// paint at 0 for a frame and then pop into place. `markers`, `readingLine`
	// or the motion preference changing after mount re-runs it, which is the
	// re-read of the layout the source schedules for those changes.
	useIsomorphicLayoutEffect(() => {
		const s = stateRef.current;
		const onScroll = rafThrottle(place);
		const onResize = rafThrottle(measure);

		const resizeObserver = new ResizeObserver(() => onResize());
		if (contentRef.current) resizeObserver.observe(contentRef.current);
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onResize, { passive: true });
		measure();

		return () => {
			onScroll.cancel();
			onResize.cancel();
			cancelAnimationFrame(s.rafId);
			s.rafId = 0;
			resizeObserver.disconnect();
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onResize);
		};
	}, [place, measure]);

	// `--tb-progress` is owned by the frame loop between renders; a render
	// re-states the latest value so React never writes a stale one back over it.
	const rootStyle = {
		"--tracing-beam-accent": accent,
		"--tb-progress": `${stateRef.current.head}px`,
		"--tb-height": `${height}px`,
	} as CSSProperties;

	return (
		<div
			ref={rootRef}
			className={cn("tb-root relative mx-auto w-full max-w-4xl", className)}
			style={rootStyle}
			data-motion={reduced ? "reduced" : "full"}
			data-tracing-beam=""
		>
			{/* Gutter: the rail, its markers and the lamp, all out of the content's way */}
			<div className="tb-gutter" aria-hidden="true">
				<div className="tb-rail">
					<span className="tb-hair"></span>
					<span className="tb-trail"></span>
				</div>
				{ticks.map((offset, index) => (
					<span
						key={index}
						className="tb-tick"
						style={{ top: `${offset}px` }}
						data-tracing-beam-marker=""
						data-lit={lit[index] ?? false}
					></span>
				))}
				<div className="tb-head" data-tracing-beam-head="" data-ready={ready}>
					<span className="tb-spill"></span>
					<span className="tb-lamp"></span>
				</div>
			</div>

			<div ref={contentRef} className="tb-content">
				{children}
			</div>
		</div>
	);
}
