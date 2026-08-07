<script lang="ts" module>
	/**
	 * Props for VoiceInput
	 */
	export interface VoiceInputProps {
		/**
		 * Whether a recording is in progress. Bindable — the mic, cancel and confirm
		 * buttons all write through it, and setting it from outside opens or closes
		 * the panel without firing any callback.
		 */
		active?: boolean;
		/**
		 * Live text pushed by the consumer as their recogniser produces it. Rendered
		 * muted under the waveform; a growing string simply grows in place.
		 */
		transcript?: string;
		/**
		 * Amplitude levels in 0..1, bridged from whatever audio pipeline the
		 * consumer already owns. This component never opens a microphone itself.
		 */
		samples?: ArrayLike<number>;
		/**
		 * Draw a synthetic waveform when no `samples` arrive, so the component is
		 * legible on a docs page or in a story with no audio behind it.
		 */
		demo?: boolean;
		/** Called when the mic button starts a recording. */
		onStart?: () => void;
		/** Called when the confirm button ends a recording and keeps the transcript. */
		onStop?: () => void;
		/** Called when the cancel button abandons a recording. */
		onCancel?: () => void;
		/** Waveform height in CSS pixels. Clamped to 16..240. */
		height?: number;
		/** Any CSS colour for the bars, including a `var()` — resolved before painting. */
		color?: string;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createElapsed } from "../_internals/elapsed.svelte.js";
	import { drawWaveformFrame, fakeWaveSample } from "../_internals/waveform-core.js";

	let {
		active = $bindable(false),
		transcript = "",
		samples,
		demo = false,
		onStart,
		onStop,
		onCancel,
		height = 48,
		color = "var(--ft-voice-color, currentColor)",
		class: className,
		ref = $bindable(null),
	}: VoiceInputProps = $props();

	/** Bar geometry, in CSS pixels. Fixed: the waveform is a meter, not a chart. */
	const BAR_WIDTH = 3;
	const BAR_GAP = 2;
	/** Amplitude floor, so silence still reads as a live signal rather than a gap. */
	const MIN_AMP = 0.06;
	/** Below the floor the bars stop resolving; above the ceiling this is a chart. */
	const MIN_HEIGHT = 16;
	const MAX_HEIGHT = 240;
	/** Handed to the renderer when there is no signal and no stand-in for one. */
	const NO_SIGNAL: number[] = [];

	let mounted = $state(false);
	let canvasEl = $state<HTMLCanvasElement | null>(null);

	const barHeight = $derived(
		Number.isFinite(height) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, height)) : 48
	);

	const elapsed = createElapsed();
	// ISO 8601 duration, so the reading is machine-readable and not just decorative.
	const elapsedDateTime = $derived(`PT${Math.max(0, Math.floor(elapsed.ms / 1000))}S`);

	onMount(() => {
		mounted = true;
	});

	// `start` hands back its own stop function, which doubles as the cleanup: the
	// stopwatch exists only between the two, and each recording is timed from its
	// own zero rather than continuing the last one.
	$effect(() => {
		if (active) return elapsed.start(Date.now());
	});

	function prefersReducedMotion(): boolean {
		return (
			typeof window.matchMedia === "function" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		);
	}

	function start() {
		if (active) return;
		active = true;
		onStart?.();
	}

	function cancel() {
		active = false;
		onCancel?.();
	}

	function finish() {
		active = false;
		onStop?.();
	}

	/*
	 * The whole canvas lifetime is one effect. It re-runs when the panel appears
	 * or disappears, when the canvas is (re)attached, and when the geometry or the
	 * colour changes — all rare. Everything that changes per frame is read from
	 * inside the rAF callback, which runs outside any tracking context, so a
	 * consumer pushing sixty sample buffers a second does not tear the loop down
	 * and rebuild it sixty times a second.
	 */
	$effect(() => {
		// `$effect` never runs on the server; `mounted` additionally keeps the loop
		// from starting before the panel's canvas is in the document.
		if (!mounted || !active) return;

		const el = canvasEl;
		if (!el) return;

		// jsdom and a browser that refuses to back the surface both hand back null.
		// The panel is still legible without bars — a timer, a transcript and two
		// buttons — so this is a return, not a throw.
		const context = el.getContext("2d");
		if (!context) return;

		// Re-declared with non-null types: the helpers below capture both, and a
		// narrowing does not survive the closure boundary.
		const canvas: HTMLCanvasElement = el;
		const ctx: CanvasRenderingContext2D = context;

		// Tracked on purpose: a new height or colour restarts the loop with it.
		const h = barHeight;
		const requested = color;

		// `fillStyle` understands neither `var()` nor `currentColor`, so the prop is
		// written onto the element as its CSS `color` (see the `style:color` below)
		// and read back resolved. One style recalculation per effect run, never one
		// per frame.
		const fill = getComputedStyle(canvas).color || requested;

		const style = {
			color: fill,
			barWidth: BAR_WIDTH,
			gap: BAR_GAP,
			minAmp: MIN_AMP,
			mirror: true,
		};

		const reduced = prefersReducedMotion();

		let cssWidth = 0;
		let synthetic = new Float32Array(0);
		let frame: number | undefined;

		function resize() {
			const dpr = window.devicePixelRatio || 1;
			cssWidth = canvas.clientWidth;
			canvas.width = Math.max(1, Math.round(cssWidth * dpr));
			canvas.height = Math.max(1, Math.round(h * dpr));
			// Assigning width or height resets the context, so the device-pixel
			// transform is re-applied here and every measurement below stays in CSS
			// pixels.
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			// One synthetic sample per bar, so `demo` never has to be resampled.
			const bars = Math.max(0, Math.floor(cssWidth / (BAR_WIDTH + BAR_GAP)));
			if (synthetic.length !== bars) synthetic = new Float32Array(bars);
		}

		function levels(tMs: number): ArrayLike<number> {
			// A real pipeline always wins. `demo` is the stand-in for a page with no
			// microphone behind it, and neither one means an honest flat floor.
			if (samples && samples.length > 0) return samples;
			if (!demo) return NO_SIGNAL;
			for (let i = 0; i < synthetic.length; i++) synthetic[i] = fakeWaveSample(i, tMs);
			return synthetic;
		}

		function paint(tMs: number) {
			drawWaveformFrame(ctx, levels(tMs), cssWidth, h, style);
		}

		resize();

		const observer = new ResizeObserver(() => {
			resize();
			// The animated path repaints on its own a frame later; the still one has
			// to be told, or a resized panel keeps a stale drawing.
			if (reduced) untrack(() => paint(0));
		});
		observer.observe(canvas);

		if (reduced) {
			// One frame and then nothing. A sixty-per-second amplitude meter is
			// precisely the motion this setting asks us not to run, and the recording
			// is still announced, still timed, and still transcribed without it.
			// Untracked so that a consumer pushing samples cannot restart the effect
			// and turn the still frame back into an animation.
			untrack(() => paint(0));
		} else {
			const started = performance.now();
			const loop = (now: number) => {
				paint(now - started);
				frame = requestAnimationFrame(loop);
			};
			frame = requestAnimationFrame(loop);
		}

		return () => {
			if (frame !== undefined) cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});
</script>

<div
	bind:this={ref}
	class={cn("ft-voice", className)}
	role="group"
	aria-label="Voice input"
	data-active={active ? "true" : "false"}
>
	<!--
		A live region that outlives the state change it reports: swapping the text
		inside a region already in the document is announced reliably, where a
		region inserted along with its own text is not.
	-->
	<span class="ft-voice-status sr-only" role="status">{active ? "Recording" : ""}</span>

	{#if !active}
		<button
			type="button"
			class="ft-voice-mic text-muted-foreground hover:text-foreground hover:bg-foreground/5 inline-flex size-9 flex-none items-center justify-center rounded-full border transition-colors"
			aria-label="Start voice input"
			onclick={start}
		>
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
				<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
				<path d="M12 19v3" />
			</svg>
		</button>
	{:else}
		<div
			class="ft-voice-panel bg-card/50 flex w-full items-center gap-3 rounded-lg border px-3 py-2"
		>
			<span class="ft-voice-dot flex-none" aria-hidden="true"></span>

			<div class="ft-voice-signal min-w-0 flex-1">
				<!--
					Purely a picture of the amplitude that the timer and the transcript
					already state in words, so it is hidden rather than described.
				-->
				<canvas
					bind:this={canvasEl}
					class="ft-voice-canvas block w-full"
					style:height="{barHeight}px"
					style:color
					aria-hidden="true"
				></canvas>

				{#if transcript}
					<p class="ft-voice-transcript text-muted-foreground mt-1 text-xs leading-relaxed">
						{transcript}
					</p>
				{/if}
			</div>

			<time
				class="ft-voice-elapsed text-muted-foreground flex-none text-xs tabular-nums"
				datetime={elapsedDateTime}>{elapsed.text}</time
			>

			<button
				type="button"
				class="ft-voice-btn text-muted-foreground hover:text-foreground hover:bg-foreground/5 inline-flex size-7 flex-none items-center justify-center rounded-full transition-colors"
				aria-label="Cancel voice input"
				onclick={cancel}
			>
				<svg
					class="size-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>

			<button
				type="button"
				class="ft-voice-btn ft-voice-confirm text-foreground hover:bg-foreground/10 bg-foreground/5 inline-flex size-7 flex-none items-center justify-center rounded-full transition-colors"
				aria-label="Stop voice input"
				onclick={finish}
			>
				<svg
					class="size-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M20 6 9 17l-5-5" />
				</svg>
			</button>
		</div>
	{/if}
</div>

<style>
	/*
	 * The dot is read at the point of use through two hooks: this component's own
	 * `--ft-voice-dot`, then the `--ft-status-*` vocabulary the whole AI family
	 * shares. Setting either anywhere up the tree retints it without having to win
	 * a specificity fight against these scoped rules.
	 *
	 * It takes `running` rather than `error` because a recording in progress is a
	 * run in flight, not a failure — retinting the family's error colour should
	 * not turn the record light red. Consumers who want the classic red record dot
	 * say so in one line: `--ft-voice-dot: oklch(0.6 0.2 25)`.
	 */
	.ft-voice-dot {
		position: relative;
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: var(
			--ft-voice-dot,
			var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
		);
	}

	.ft-voice-dot::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: inherit;
		opacity: 0;
	}

	.ft-voice-transcript {
		/* Wrapping rather than scrolling sideways, and capped rather than unbounded:
		   a two-minute dictation should not push the controls off the panel. */
		max-height: var(--ft-voice-transcript-max-height, 4.5rem);
		overflow-y: auto;
		overflow-wrap: anywhere;
	}

	/*
	 * The only animation in the component lives behind the query, so reduced
	 * motion is not a second variant to keep in sync: the dot is simply a static
	 * dot, still the same colour, still saying the same thing.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-voice-dot::after {
			animation: ft-voice-pulse var(--ft-voice-pulse-duration, 1.6s) cubic-bezier(0, 0, 0.2, 1)
				infinite;
		}
	}

	@keyframes ft-voice-pulse {
		0% {
			transform: scale(1);
			opacity: 0.55;
		}
		75%,
		100% {
			transform: scale(2.6);
			opacity: 0;
		}
	}
</style>
