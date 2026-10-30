<!--
	MathBubble: a comic bubble that draws itself, then a formula written inside it by hand.

	Everything that is drawn comes from the framework-free engine in `handwrite-core.ts`. Before the
	drawing starts (on the server, without JavaScript, or under reduced motion) the finished frame is
	inline SVG; once it starts, a canvas draws one frame of the timeline per animation frame.
-->
<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createMathBubble, type MathBubble as Drawing } from "./handwrite-core.js";
	import { cycleDuration } from "./handwrite-timeline.js";
	import type { MathBubbleProps } from "./types.js";
	import { inView } from "../_internals/motion/in-view.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";

	let {
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
		class: className,
		onComplete,
	}: MathBubbleProps = $props();

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

	const reduced = createReducedMotion();

	const formulas = $derived(Array.isArray(formula) ? (formula.length ? formula : [""]) : [formula]);
	const drawings: Drawing[] = $derived(
		formulas.map((f) =>
			createMathBubble(f, { bubble, tail, tailOffset, speed, seed, size, strokeWidth, hold })
		)
	);
	const box = $derived({
		width: Math.max(...drawings.map((d) => d.size.width)),
		height: Math.max(...drawings.map((d) => d.size.height)),
	});
	const label = $derived(ariaLabel ?? formulas.join(", "));

	/** Which formula is shown, and whether as the static SVG or on the canvas. */
	let index = $state(0);
	let mode = $state<"static" | "canvas">("static");
	const current = $derived(drawings[Math.min(index, drawings.length - 1)]);
	const svg = $derived(current.svg());

	let root = $state<HTMLSpanElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let frame = 0;
	let startedAt = 0;
	let completedPass = false;

	/** Where a still at `ms` lands: which formula, and how far into it. */
	function locate(ms: number): { i: number; local: number } {
		let local = Math.max(0, ms);
		let i = 0;
		for (let guard = 0; guard < 10_000; guard++) {
			const last = i === drawings.length - 1;
			const cycle = cycleDuration(drawings[i].timeline);
			if (local < cycle || (last && !loop) || cycle <= 0) break;
			local -= cycle;
			i = last ? 0 : i + 1;
		}
		return { i, local };
	}

	function paint(drawing: Drawing, ms: number): void {
		const el = canvas;
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
		if (frame) cancelAnimationFrame(frame);
		frame = 0;
	}

	function tick(now: number): void {
		frame = 0;
		if (reduced.current) {
			// The preference changed mid-drawing: snap to the end state.
			index = loop ? 0 : drawings.length - 1;
			mode = "static";
			if (!completedPass) onComplete?.();
			return;
		}
		const drawing = current;
		const elapsed = now - startedAt;
		paint(drawing, elapsed);
		const last = index >= drawings.length - 1;
		if (elapsed >= drawing.timeline.duration && last && !completedPass) {
			completedPass = true;
			onComplete?.();
			if (!loop) {
				mode = "static";
				return;
			}
		}
		if (elapsed >= cycleDuration(drawing.timeline)) {
			index = last ? 0 : index + 1;
			if (last) completedPass = false;
			startedAt = now;
		}
		frame = requestAnimationFrame(tick);
	}

	/** Writes the formula from the start. */
	export function play(): void {
		if (typeof window === "undefined" || t !== undefined) return;
		stop();
		completedPass = false;
		if (reduced.current || prefersReducedMotion()) {
			index = loop ? 0 : drawings.length - 1;
			mode = "static";
			onComplete?.();
			return;
		}
		index = 0;
		mode = "canvas";
		startedAt = performance.now();
		frame = requestAnimationFrame(tick);
	}

	/** Stops the drawing and returns to the first formula's finished still. */
	export function reset(): void {
		stop();
		completedPass = false;
		index = 0;
		mode = "static";
	}

	$effect(() => {
		if (t !== undefined || trigger === "manual" || !root) return;
		if (trigger === "mount") {
			untrack(play);
			return;
		}
		// One-shot by hand rather than `once: true`, which would be consumed by a sub-threshold entry.
		let fired = false;
		let action: ReturnType<typeof inView> | undefined;
		action = inView(root, {
			threshold: START_RATIO,
			once: false,
			onChange: (visible, entry) => {
				if (fired || !visible || (entry !== undefined && !mostlyInView(entry))) return;
				fired = true;
				action?.destroy?.();
				untrack(play);
			},
		});
		return () => action?.destroy?.();
	});

	// A still at `t`: one frame, no animation loop.
	$effect(() => {
		if (t === undefined) return;
		stop();
		const { i, local } = locate(t);
		index = i;
		mode = "canvas";
		if (canvas) paint(drawings[i], local);
	});

	$effect(() => stop);
</script>

<span
	bind:this={root}
	role="img"
	aria-label={label}
	data-slot="math-bubble"
	data-state={mode === "canvas" ? "drawing" : "still"}
	class={cn("relative inline-grid place-items-center align-middle", className)}
	style:width="{box.width}px"
	style:height="{box.height}px"
	style:color={ink === "currentColor" ? undefined : ink}
>
	{#if mode === "canvas"}
		<canvas
			bind:this={canvas}
			aria-hidden="true"
			class="block"
			style:width="{current.size.width}px"
			style:height="{current.size.height}px"
		></canvas>
	{:else}
		<svg
			aria-hidden="true"
			class="block overflow-visible"
			width={svg.width}
			height={svg.height}
			viewBox={svg.viewBox}
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			{#each svg.paths as p, i (i)}
				<path d={p.d} stroke-width={p.width} data-kind={p.kind} />
			{/each}
		</svg>
	{/if}
</span>
