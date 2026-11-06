/**
 * MathBubble: a comic bubble that draws itself, then a formula written inside it by hand.
 *
 * Everything that is drawn comes from the framework-free engine in `handwrite-core.ts`. Before the
 * drawing starts (on the server, without JavaScript, or under reduced motion) the finished frame is
 * inline SVG; once it starts, a canvas draws one frame of the timeline per animation frame.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { cn } from "../../utils.js";
import { createMathBubble, type MathBubble as MathBubbleDrawing } from "./handwrite-core.js";
import { cycleDuration } from "./handwrite-timeline.js";
import type { MathBubbleHandle, MathBubbleProps } from "./types.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";

export type { MathBubbleHandle, MathBubbleProps } from "./types.js";

const START_RATIO = 0.6;

/**
 * Whether an observer entry shows the bubble 60% in view (or filling 60% of a viewport too short
 * for it). The observer also reports a bare overlap below the threshold, on observe() and when
 * the bubble first enters the viewport, so `isIntersecting` alone would start it offscreen.
 */
function mostlyInView(entry: IntersectionObserverEntry): boolean {
	return (
		entry.intersectionRatio >= START_RATIO ||
		(entry.rootBounds != null && entry.intersectionRect.height >= START_RATIO * entry.rootBounds.height)
	);
}

export const MathBubble = forwardRef<MathBubbleHandle, MathBubbleProps>(function MathBubble(
	{
		formula,
		bubble = "speech",
		tail = "bottom",
		tailOffset = 0.25,
		speed = 5,
		seed = 1,
		size = 32,
		strokeWidth = 2.2,
		ink = "currentColor",
		trigger = "inView",
		loop = false,
		hold = 1800,
		ariaLabel,
		t,
		className,
		onComplete,
	},
	ref
) {
	const reduced = useReducedMotion();

	const formulas = Array.isArray(formula) ? (formula.length ? formula : [""]) : [formula];
	const formulasKey = JSON.stringify(formulas);
	const drawings: MathBubbleDrawing[] = useMemo(
		() =>
			(JSON.parse(formulasKey) as string[]).map((f) =>
				createMathBubble(f, { bubble, tail, tailOffset, speed, seed, size, strokeWidth, hold })
			),
		[formulasKey, bubble, tail, tailOffset, speed, seed, size, strokeWidth, hold]
	);
	const box = {
		width: Math.max(...drawings.map((d) => d.size.width)),
		height: Math.max(...drawings.map((d) => d.size.height)),
	};
	const label = ariaLabel ?? formulas.join(", ");

	/** Which formula is shown, and whether as the static SVG or on the canvas. */
	const [index, setIndexState] = useState(0);
	const [mode, setMode] = useState<"static" | "canvas">("static");
	const current = drawings[Math.min(index, drawings.length - 1)]!;
	const svg = useMemo(() => current.svg(), [current]);

	const rootRef = useRef<HTMLSpanElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const indexRef = useRef(0);
	const frame = useRef(0);
	const startedAt = useRef(0);
	const completedPass = useRef(false);
	const live = useLiveRef({ drawings, loop, t, reduced, onComplete });

	function setIndex(i: number): void {
		indexRef.current = i;
		setIndexState(i);
	}

	/** Where a still at `ms` lands: which formula, and how far into it. */
	function locate(ms: number): { i: number; local: number } {
		const { drawings: ds, loop: looping } = live.current;
		let local = Math.max(0, ms);
		let i = 0;
		for (let guard = 0; guard < 10_000; guard++) {
			const last = i === ds.length - 1;
			const cycle = cycleDuration(ds[i]!.timeline);
			if (local < cycle || (last && !looping) || cycle <= 0) break;
			local -= cycle;
			i = last ? 0 : i + 1;
		}
		return { i, local };
	}

	function paint(drawing: MathBubbleDrawing, ms: number): void {
		const el = canvasRef.current;
		const root = rootRef.current;
		if (!el || !root) return;
		const ctx = el.getContext("2d");
		if (!ctx) return;
		const dpr = window.devicePixelRatio || 1;
		const w = Math.round(drawing.size.width * dpr);
		const h = Math.round(drawing.size.height * dpr);
		if (el.width !== w) el.width = w;
		if (el.height !== h) el.height = h;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, w, h);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		drawing.draw(ctx, ms);
		// Tint the ink with the resolved colour at draw time, so a theme change follows.
		ctx.globalCompositeOperation = "source-in";
		ctx.fillStyle = getComputedStyle(root).color;
		ctx.fillRect(0, 0, drawing.size.width, drawing.size.height);
		ctx.globalCompositeOperation = "source-over";
	}

	function stop(): void {
		if (frame.current) cancelAnimationFrame(frame.current);
		frame.current = 0;
	}

	function tick(now: number): void {
		frame.current = 0;
		const { drawings: ds, loop: looping, reduced: isReduced, onComplete: done } = live.current;
		if (isReduced) {
			// The preference changed mid-drawing: snap to the end state.
			setIndex(looping ? 0 : ds.length - 1);
			setMode("static");
			if (!completedPass.current) done?.();
			return;
		}
		const at = indexRef.current;
		const drawing = ds[Math.min(at, ds.length - 1)]!;
		const elapsed = now - startedAt.current;
		paint(drawing, elapsed);
		const last = at >= ds.length - 1;
		if (elapsed >= drawing.timeline.duration && last && !completedPass.current) {
			completedPass.current = true;
			done?.();
			if (!looping) {
				setMode("static");
				return;
			}
		}
		if (elapsed >= cycleDuration(drawing.timeline)) {
			setIndex(last ? 0 : at + 1);
			if (last) completedPass.current = false;
			startedAt.current = now;
		}
		frame.current = requestAnimationFrame(tick);
	}

	/** Writes the formula from the start. */
	function play(): void {
		const { drawings: ds, loop: looping, t: still, reduced: isReduced, onComplete: done } =
			live.current;
		if (typeof window === "undefined" || still !== undefined) return;
		stop();
		completedPass.current = false;
		if (isReduced || prefersReducedMotion()) {
			setIndex(looping ? 0 : ds.length - 1);
			setMode("static");
			done?.();
			return;
		}
		setIndex(0);
		setMode("canvas");
		startedAt.current = performance.now();
		frame.current = requestAnimationFrame(tick);
	}

	/** Stops the drawing and returns to the first formula's finished still. */
	function reset(): void {
		stop();
		completedPass.current = false;
		setIndex(0);
		setMode("static");
	}

	const api = useLiveRef({ play, reset });
	useImperativeHandle(
		ref,
		() => ({ play: () => api.current.play(), reset: () => api.current.reset() }),
		[api]
	);

	useEffect(() => {
		const root = rootRef.current;
		if (t !== undefined || trigger === "manual" || !root) return;
		if (trigger === "mount") {
			api.current.play();
			return;
		}
		// One-shot by hand rather than `once: true`, which would be consumed by a sub-threshold entry.
		let fired = false;
		let action: ReturnType<typeof observeInView> | undefined;
		action = observeInView(root, {
			threshold: START_RATIO,
			once: false,
			onChange: (visible, entry) => {
				if (fired || !visible || (entry !== undefined && !mostlyInView(entry))) return;
				fired = true;
				action?.destroy();
				api.current.play();
			},
		});
		return () => action?.destroy();
	}, [t, trigger, api]);

	// A still at `t`: one frame, no animation loop.
	useEffect(() => {
		if (t === undefined) return;
		stop();
		const { i } = locate(t);
		setIndex(i);
		setMode("canvas");
	}, [t, drawings, loop]);

	// Paint the still once its canvas is in the DOM (and again when it changes).
	useIsomorphicLayoutEffect(() => {
		if (t === undefined || mode !== "canvas") return;
		const { i, local } = locate(t);
		paint(live.current.drawings[i]!, local);
	});

	useEffect(() => stop, []);

	return (
		<span
			ref={rootRef}
			role="img"
			aria-label={label}
			data-slot="math-bubble"
			data-state={mode === "canvas" ? "drawing" : "still"}
			className={cn("relative inline-grid place-items-center align-middle", className)}
			style={{
				width: `${box.width}px`,
				height: `${box.height}px`,
				color: ink === "currentColor" ? undefined : ink,
			}}
		>
			{mode === "canvas" ? (
				<canvas
					ref={canvasRef}
					aria-hidden="true"
					className="block"
					style={{ width: `${current.size.width}px`, height: `${current.size.height}px` }}
				/>
			) : (
				<svg
					aria-hidden="true"
					className="block overflow-visible"
					width={svg.width}
					height={svg.height}
					viewBox={svg.viewBox}
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					{svg.paths.map((p, i) => (
						<path key={i} d={p.d} strokeWidth={p.width} data-kind={p.kind} />
					))}
				</svg>
			)}
		</span>
	);
});
