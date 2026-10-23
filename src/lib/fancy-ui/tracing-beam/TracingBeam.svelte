<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface TracingBeamProps {
		/** Additional CSS classes for the outer wrapper */
		class?: string;
		/** Long-form content the beam reads alongside */
		children?: Snippet;
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
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";
	import { rafThrottle } from "../_internals/motion/raf.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	let {
		class: className = "",
		children,
		accent,
		readingLine = 0.38,
		markers = true,
	}: TracingBeamProps = $props();

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	let contentRef: HTMLDivElement | undefined = $state();

	/** Content height, so the rail's fade and the lamp's clamp know the end. */
	let height = $state(0);
	/** Marker offsets from the top of the content, in px. */
	let ticks: number[] = $state([]);
	/** Where the lamp sits, in px from the top of the content. */
	let head = $state(0);
	let ready = $state(false);

	let target = 0;
	let velocity = 0;
	let rafId = 0;
	let lastTime = 0;

	/** Markers the lamp has reached light up; the rest wait. */
	function isLit(offset: number): boolean {
		return offset <= head + 0.5;
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.min(max, Math.max(min, value));
	}

	/**
	 * Viewport px per local px. A scaled ancestor shrinks every rect we read but
	 * not the offsets we write, so rect deltas are divided by this before use.
	 * Sub-pixel rounding of `offsetHeight` is not a transform: it reads as 1.
	 */
	function localScale(el: HTMLElement, rect: DOMRect): number {
		const layout = el.offsetHeight;
		if (layout <= 0 || rect.height <= 0 || Math.abs(rect.height - layout) < 1) return 1;
		return rect.height / layout;
	}

	/** One spring step; schedules the next until the lamp has settled on `target`. */
	function step(time: number) {
		const dt = Math.min(MAX_DT, (time - lastTime) / 1000 || 0);
		lastTime = time;
		const force = TENSION * (target - head) - FRICTION * velocity;
		velocity += force * dt;
		head += velocity * dt;
		if (Math.abs(velocity) < PRECISION && Math.abs(target - head) < PRECISION) {
			head = target;
			velocity = 0;
			rafId = 0;
			return;
		}
		rafId = requestAnimationFrame(step);
	}

	/** Reads where the content sits and sends the lamp to the reading line. */
	function place() {
		if (!contentRef) return;
		const rect = contentRef.getBoundingClientRect();
		const scale = localScale(contentRef, rect);
		const line = window.innerHeight * clamp(readingLine, 0, 1);
		target = clamp((line - rect.top) / scale, 0, Math.max(0, rect.height / scale));
		ready = true;
		if (reduced.current) {
			cancelAnimationFrame(rafId);
			rafId = 0;
			velocity = 0;
			head = target;
			return;
		}
		if (!rafId) {
			lastTime = performance.now();
			rafId = requestAnimationFrame(step);
		}
	}

	/** Layout reads that only change on resize: content height and marker offsets. */
	function measure() {
		if (!contentRef) return;
		const rect = contentRef.getBoundingClientRect();
		const scale = localScale(contentRef, rect);
		height = rect.height / scale;
		if (markers) {
			const headings = contentRef.querySelectorAll<HTMLElement>("h1, h2, h3, h4");
			const anchors = headings.length ? [...headings] : [...contentRef.children];
			ticks = anchors
				.filter((el): el is HTMLElement => el instanceof HTMLElement)
				.map((el) => {
					const box = el.getBoundingClientRect();
					return (box.top + box.height / 2 - rect.top) / scale;
				});
		} else {
			ticks = [];
		}
		place();
	}

	onMount(() => {
		const onScroll = rafThrottle(place);
		const onResize = rafThrottle(measure);

		const resizeObserver = new ResizeObserver(() => onResize());
		if (contentRef) resizeObserver.observe(contentRef);
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onResize, { passive: true });
		measure();

		return () => {
			onScroll.cancel();
			onResize.cancel();
			cancelAnimationFrame(rafId);
			rafId = 0;
			resizeObserver.disconnect();
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onResize);
		};
	});

	// `markers`, `readingLine` or the motion preference changed after mount:
	// re-read the layout (`place()` snaps the lamp and stops the spring when
	// reduced motion turns on mid-flight).
	$effect(() => {
		void markers;
		void readingLine;
		void reduced.current;
		if (contentRef) queueMicrotask(measure);
	});
</script>

<div
	class={cn("tb-root relative mx-auto w-full max-w-4xl", className)}
	style:--tracing-beam-accent={accent}
	style:--tb-progress="{head}px"
	style:--tb-height="{height}px"
	data-motion={reduced.current ? "reduced" : "full"}
	data-tracing-beam
>
	<!-- Gutter: the rail, its markers and the lamp, all out of the content's way -->
	<div class="tb-gutter" aria-hidden="true">
		<div class="tb-rail">
			<span class="tb-hair"></span>
			<span class="tb-trail"></span>
		</div>
		{#each ticks as offset, index (index)}
			<span class="tb-tick" style:top="{offset}px" data-tracing-beam-marker data-lit={isLit(offset)}
			></span>
		{/each}
		<div class="tb-head" data-tracing-beam-head data-ready={ready}>
			<span class="tb-spill"></span>
			<span class="tb-lamp"></span>
		</div>
	</div>

	<div bind:this={contentRef} class="tb-content">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.tb-root {
		/* Public hooks: --tracing-beam-accent (colour), --tracing-beam-gutter (rail column width).
		   --tb-progress and --tb-height are written by the component. */
		--_tb-accent: var(--tracing-beam-accent, var(--primary, oklch(0.7 0.13 285)));
		--_tb-cool: oklch(0.74 0.09 255);
		/* Light surfaces: the glow leans on the cool tint so a dark accent never reads as a smudge. */
		--_tb-glow: color-mix(in oklab, var(--_tb-accent) 45%, var(--_tb-cool));
		/* The lamp's core: the glow pushed towards white, never pure white. */
		--_tb-hot: color-mix(in oklab, var(--_tb-glow) 45%, white);
		--_tb-hair: rgba(0, 0, 0, 0.1);
		--_tb-surface: var(--background, #fafafa);
		--_tb-read: 26%;
		--_tb-spill-a: 12%;
		--_tb-gutter: var(--tracing-beam-gutter, 2.5rem);
		/* The rail's x inside the gutter. */
		--_tb-x: 9px;
		--_tb-ease: cubic-bezier(0.16, 1, 0.3, 1);
		display: grid;
		grid-template-columns: var(--_tb-gutter) minmax(0, 1fr);
	}

	:global(.dark) .tb-root {
		/* A near-white accent (the default dark --primary) would wash out: keep the cool tint in. */
		--_tb-glow: color-mix(in oklab, var(--_tb-accent) 40%, var(--_tb-cool));
		--_tb-hot: color-mix(in oklab, var(--_tb-glow) 55%, white);
		--_tb-hair: rgba(255, 255, 255, 0.1);
		--_tb-read: 38%;
		--_tb-spill-a: 18%;
	}

	/* No `.dark` class but a dark OS: same tuning, unless a `.light` ancestor opts out. */
	@media (prefers-color-scheme: dark) {
		.tb-root:not(:global(.light, .light *)) {
			--_tb-glow: color-mix(in oklab, var(--_tb-accent) 40%, var(--_tb-cool));
			--_tb-hot: color-mix(in oklab, var(--_tb-glow) 55%, white);
			--_tb-hair: rgba(255, 255, 255, 0.1);
			--_tb-read: 38%;
			--_tb-spill-a: 18%;
		}
	}

	.tb-gutter {
		position: relative;
		pointer-events: none;
	}

	.tb-content {
		min-width: 0;
	}

	/* ── Rail ─────────────────────────────────────────────── */
	.tb-rail {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--_tb-x) - 1px);
		width: 3px;
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent,
			#000 24px,
			#000 calc(100% - 24px),
			transparent
		);
		mask-image: linear-gradient(
			to bottom,
			transparent,
			#000 24px,
			#000 calc(100% - 24px),
			transparent
		);
	}

	.tb-hair,
	.tb-trail {
		position: absolute;
		inset: 0 auto 0 1px;
		width: 1px;
	}

	.tb-hair {
		background: var(--_tb-hair);
	}

	/* What has been read stays softly lit; it brightens into the lamp; nothing past it. */
	.tb-trail {
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--_tb-glow) var(--_tb-read), transparent),
			color-mix(in oklab, var(--_tb-glow) var(--_tb-read), transparent)
				calc(var(--tb-progress) - 180px),
			color-mix(in oklab, var(--_tb-glow) 90%, transparent) var(--tb-progress),
			transparent var(--tb-progress)
		);
	}

	/* ── Markers: one tick per heading, lit once the lamp has passed ── */
	.tb-tick {
		position: absolute;
		left: calc(var(--_tb-x) - 1px);
		height: 1px;
		width: 12px;
		margin-top: -0.5px;
		background: var(--_tb-hair);
		transform-origin: left center;
		transform: scaleX(0.5);
		transition:
			background-color 0.5s var(--_tb-ease),
			transform 0.5s var(--_tb-ease),
			box-shadow 0.5s var(--_tb-ease);
	}

	.tb-tick::before {
		/* The notch on the rail itself: a 5px dot the tick grows from. */
		content: "";
		position: absolute;
		left: -2px;
		top: -2px;
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: var(--_tb-surface);
		box-shadow: 0 0 0 1px var(--_tb-hair);
		transition: inherit;
	}

	.tb-tick[data-lit="true"] {
		background: color-mix(in oklab, var(--_tb-glow) 80%, transparent);
		transform: scaleX(1);
		box-shadow: 0 0 6px color-mix(in oklab, var(--_tb-glow) 60%, transparent);
	}

	.tb-tick[data-lit="true"]::before {
		background: var(--_tb-hot);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--_tb-glow) 70%, transparent),
			0 0 8px color-mix(in oklab, var(--_tb-glow) 60%, transparent);
	}

	/* ── Lamp: a short hot segment on the rail, and its light spilling onto the lines being read ── */
	.tb-head {
		position: absolute;
		top: 0;
		left: var(--_tb-x);
		width: 0;
		height: 0;
		transform: translate3d(0, var(--tb-progress), 0);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.tb-head[data-ready="true"] {
		opacity: 1;
	}

	.tb-lamp {
		position: absolute;
		left: -1.5px;
		top: -14px;
		width: 3px;
		height: 28px;
		border-radius: 999px;
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--_tb-glow) 60%, transparent),
			var(--_tb-hot) 35%,
			var(--_tb-hot) 65%,
			color-mix(in oklab, var(--_tb-glow) 60%, transparent)
		);
		box-shadow:
			0 0 5px color-mix(in oklab, var(--_tb-glow) 90%, transparent),
			0 0 18px 3px color-mix(in oklab, var(--_tb-glow) 60%, transparent);
	}

	.tb-spill {
		position: absolute;
		left: 0;
		top: -56px;
		width: 220px;
		height: 112px;
		border-radius: 999px;
		background: radial-gradient(
			farthest-side at 0 50%,
			color-mix(in oklab, var(--_tb-glow) var(--_tb-spill-a), transparent),
			color-mix(in oklab, var(--_tb-glow) calc(var(--_tb-spill-a) / 3), transparent) 45%,
			transparent
		);
		filter: blur(8px);
	}

	/* ── Reduced motion: the lamp still reads, it just does not trail or fade ── */
	.tb-root[data-motion="reduced"] .tb-tick,
	.tb-root[data-motion="reduced"] .tb-tick::before,
	.tb-root[data-motion="reduced"] .tb-head {
		transition: none;
	}

	.tb-root[data-motion="reduced"] .tb-spill {
		display: none;
	}
</style>
