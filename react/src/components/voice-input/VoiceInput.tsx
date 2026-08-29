import { forwardRef, useEffect, useState } from "react";
import { cn } from "../../utils.js";
import { useElapsed } from "../../internals/use-elapsed.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { drawWaveformFrame, fakeWaveSample } from "../../internals/waveform-core.js";
import "./voice-input.css";

/**
 * Props for VoiceInput
 */
export interface VoiceInputProps {
	/**
	 * Whether a recording is in progress. Controlled when supplied — pair it
	 * with `onActiveChange`, the React counterpart of the Svelte source's
	 * `bind:active`; the component keeps its own copy either way, so the mic,
	 * cancel and confirm buttons all write through it, and setting it from
	 * outside opens or closes the panel without firing any callback.
	 */
	active?: boolean;
	/**
	 * Called with the new recording state whenever one of the buttons changes
	 * it. Never fired for a change driven from outside through `active` — the
	 * callbacks report what the user did, not what the state is.
	 */
	onActiveChange?: (active: boolean) => void;
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
	className?: string;
}

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

function prefersReducedMotion(): boolean {
	return (
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/**
 * A mic button that opens into a recording panel: a live waveform, a stopwatch,
 * the transcript as it arrives, and a cross and a check to throw it away or keep
 * it.
 *
 * The root element arrives through the ref channel rather than a `ref` prop, per
 * PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const VoiceInput = forwardRef<HTMLDivElement, VoiceInputProps>(function VoiceInput(
	{
		active: activeProp,
		onActiveChange,
		transcript = "",
		samples,
		demo = false,
		onStart,
		onStop,
		onCancel,
		height = 48,
		color = "var(--ft-voice-color, currentColor)",
		className,
	},
	ref
) {
	/*
	 * `active = $bindable(false)` on the Svelte side: a supplied prop opens or
	 * closes the panel, and the component's own copy is what the three buttons
	 * write. One shape covers a caller driving `active` from its own state, a
	 * caller who passes only `onActiveChange`, and a caller who passes neither
	 * and lets the buttons run the whole thing.
	 *
	 * Re-synced in the render path, not an effect: an effect would paint one
	 * frame of the stale value first, and the pattern React documents for
	 * "adjust state when a prop changes" is exactly this — set state on the
	 * component that owns it, during render, and let React restart the render
	 * before committing anything.
	 */
	const [active, setActiveState] = useState(activeProp ?? false);
	const [lastActiveProp, setLastActiveProp] = useState(activeProp);
	if (lastActiveProp !== activeProp) {
		setLastActiveProp(activeProp);
		setActiveState(activeProp ?? false);
	}

	/*
	 * The canvas node itself, not a `useRef`: it exists only inside the `active`
	 * branch, so an effect keyed on a ref would fire while `current` is still
	 * null and never run again (convention C-1).
	 */
	const [canvasEl, canvasRef] = useElementRef<HTMLCanvasElement>();

	const barHeight = Number.isFinite(height)
		? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, height))
		: 48;

	const elapsed = useElapsed();
	// ISO 8601 duration, so the reading is machine-readable and not just decorative.
	const elapsedDateTime = `PT${Math.max(0, Math.floor(elapsed.ms / 1000))}S`;

	// `start` hands back its own stop function, which doubles as the cleanup: the
	// stopwatch exists only between the two, and each recording is timed from its
	// own zero rather than continuing the last one.
	const { start: startElapsed } = elapsed;
	useEffect(() => {
		if (active) return startElapsed(Date.now());
	}, [active, startElapsed]);

	/*
	 * Read from inside the running loop only, never as effect dependencies — the
	 * counterpart of the source reading them inside the rAF callback, which runs
	 * outside any tracking context.
	 */
	const samplesRef = useLiveRef(samples);
	const demoRef = useLiveRef(demo);

	// The only place `active` changes on this side of the wire.
	function setActive(next: boolean) {
		if (active === next) return;
		setActiveState(next);
		onActiveChange?.(next);
	}

	function handleStart() {
		if (active) return;
		setActive(true);
		onStart?.();
	}

	function handleCancel() {
		setActive(false);
		onCancel?.();
	}

	function handleFinish() {
		setActive(false);
		onStop?.();
	}

	/*
	 * The whole canvas lifetime is one effect. It re-runs when the panel appears
	 * or disappears, when the canvas is (re)attached, and when the geometry or the
	 * colour changes — all rare. Everything that changes per frame is read from
	 * inside the rAF callback through a live ref, so a consumer pushing sixty
	 * sample buffers a second does not tear the loop down and rebuild it sixty
	 * times a second.
	 */
	useEffect(() => {
		// An effect never runs on the server, and `canvasEl` is null until the
		// panel's canvas is in the document — together they are the source's
		// `mounted` flag.
		if (!active) return;

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

		// Dependencies on purpose: a new height or colour restarts the loop with it.
		const h = barHeight;
		const requested = color;

		// `fillStyle` understands neither `var()` nor `currentColor`, so the prop is
		// written onto the element as its CSS `color` (see the `style` below) and
		// read back resolved. One style recalculation per effect run, never one per
		// frame.
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
			const pushed = samplesRef.current;
			if (pushed && pushed.length > 0) return pushed;
			if (!demoRef.current) return NO_SIGNAL;
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
			if (reduced) paint(0);
		});
		observer.observe(canvas);

		if (reduced) {
			// One frame and then nothing. A sixty-per-second amplitude meter is
			// precisely the motion this setting asks us not to run, and the recording
			// is still announced, still timed, and still transcribed without it.
			// Incoming samples cannot restart the effect and turn the still frame back
			// into an animation: they are read through a ref, never a dependency.
			paint(0);
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
	}, [active, canvasEl, barHeight, color, samplesRef, demoRef]);

	return (
		<div
			ref={ref}
			className={cn("ft-voice", className)}
			role="group"
			aria-label="Voice input"
			data-active={active ? "true" : "false"}
		>
			{/*
				A live region that outlives the state change it reports: swapping the
				text inside a region already in the document is announced reliably,
				where a region inserted along with its own text is not.
			*/}
			<span className="ft-voice-status sr-only" role="status">
				{active ? "Recording" : ""}
			</span>

			{!active ? (
				<button
					type="button"
					className="ft-voice-mic text-muted-foreground hover:text-foreground hover:bg-foreground/5 inline-flex size-9 flex-none items-center justify-center rounded-full border transition-colors"
					aria-label="Start voice input"
					onClick={handleStart}
				>
					<svg
						className="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
						<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
						<path d="M12 19v3" />
					</svg>
				</button>
			) : (
				<div className="ft-voice-panel bg-card/50 flex w-full items-center gap-3 rounded-lg border px-3 py-2">
					<span className="ft-voice-dot flex-none" aria-hidden="true" />

					<div className="ft-voice-signal min-w-0 flex-1">
						{/*
							Purely a picture of the amplitude that the timer and the
							transcript already state in words, so it is hidden rather than
							described.
						*/}
						<canvas
							ref={canvasRef}
							className="ft-voice-canvas block w-full"
							style={{ height: `${barHeight}px`, color }}
							aria-hidden="true"
						/>

						{transcript ? (
							<p className="ft-voice-transcript text-muted-foreground mt-1 text-xs leading-relaxed">
								{transcript}
							</p>
						) : null}
					</div>

					<time
						className="ft-voice-elapsed text-muted-foreground flex-none text-xs tabular-nums"
						dateTime={elapsedDateTime}
					>
						{elapsed.text}
					</time>

					<button
						type="button"
						className="ft-voice-btn text-muted-foreground hover:text-foreground hover:bg-foreground/5 inline-flex size-7 flex-none items-center justify-center rounded-full transition-colors"
						aria-label="Cancel voice input"
						onClick={handleCancel}
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
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					</button>

					<button
						type="button"
						className="ft-voice-btn ft-voice-confirm text-foreground hover:bg-foreground/10 bg-foreground/5 inline-flex size-7 flex-none items-center justify-center rounded-full transition-colors"
						aria-label="Stop voice input"
						onClick={handleFinish}
					>
						<svg
							className="size-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
					</button>
				</div>
			)}
		</div>
	);
});
