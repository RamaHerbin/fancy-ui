<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type BaseProps = {
		/** Colours of the beam, spread along its arc */
		colors?: string[];
		/** Time for the beam to travel once around the button, in milliseconds */
		duration?: number;
		/** Width of the lit border in pixels */
		borderWidth?: number;
		/** Border radius in pixels */
		borderRadius?: number;
		/** Softness of the glow the beam casts inside the button, in pixels */
		blur?: number;
		/** Background color of the button face */
		bgColor?: string;
		/** Custom CSS class */
		class?: string;
		/** Button content */
		children?: Snippet;
		/**
		 * Plays the `hover` cue on mouse/pen pointer enter and the `press` cue on
		 * click. Off by default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
		/**
		 * Beta, off by default. On a display that reports HDR, add the beam's light above SDR white on
		 * the border, in a WebGPU layer with extended tone mapping, following the
		 * CSS spin exactly. Elsewhere nothing changes.
		 */
		hdr?: boolean;
	};

	export type GradientButtonProps = BaseProps & Omit<HTMLButtonAttributes, keyof BaseProps>;

	/**
	 * The beam as a conic gradient: a main arc carrying every colour over ~40%
	 * of the turn, and a fainter echo opposite it. Turned by `--gb-angle`.
	 */
	export function beamGradient(colors: string[]): string {
		const list = colors.length ? colors : ["#ffffff"];
		const arc = (from: number, to: number, strength: number) => {
			const span = to - from;
			const stops = list.map((c, i) => {
				const at = from + span * ((i + 1) / (list.length + 1));
				const color = strength < 100 ? `color-mix(in srgb, ${c} ${strength}%, transparent)` : c;
				return `${color} ${at.toFixed(1)}%`;
			});
			return [`transparent ${from}%`, ...stops, `transparent ${to}%`].join(", ");
		};
		return `conic-gradient(from var(--gb-angle), ${arc(0, 42, 100)}, ${arc(50, 78, 45)}, transparent 100%)`;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { soundFeedback } from "../sound/sound-feedback.js";
	import { attachHdrLight, hdrLightAvailable } from "../_internals/hdr/hdr-light.js";
	import { conicBorderProbe } from "../_internals/hdr/hdr-probes.js";

	let {
		class: className,
		colors = ["#34d399", "#22d3ee", "#6366f1", "#d946ef", "#f43f5e", "#f59e0b"],
		duration = 3000,
		borderWidth = 1.5,
		borderRadius = 12,
		blur = 4,
		bgColor = "#161616",
		children,
		onclick,
		sound = false,
		hdr = false,
		...restProps
	}: GradientButtonProps = $props();

	// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
	// off (and never the default click → press, which `handleClick` already plays).
	const hoverFeedback = $derived({
		on: sound ? { pointerenter: "hover" as const } : ({} as Record<string, never>),
		disabled: !!restProps.disabled,
	});

	let button: HTMLButtonElement | undefined = $state();
	let hdrCanvas: HTMLCanvasElement | undefined = $state();
	// Rendered only on a device that can use it: no extra DOM on SDR displays.
	let hdrCapable = $state(false);
	$effect(() => {
		hdrCapable = hdrLightAvailable();
	});

	// The HDR light reads the live, CSS-animated `--gb-angle`, so it turns with
	// the beam by construction: the main arc peaks mid-way, the echo is fainter.
	$effect(() => {
		if (!button || !hdrCanvas) return;
		const pick = (t: number) => {
			const list = colors.length ? colors : ["#ffffff"];
			return list[Math.min(list.length - 1, Math.floor(t * list.length))]!;
		};
		return attachHdrLight({
			host: button,
			canvas: hdrCanvas,
			pad: 0,
			probe: conicBorderProbe({
				angleFrom: button,
				angleVar: "--gb-angle",
				radius: () => borderRadius,
				inset: () => borderWidth / 2,
				level: () => (button?.matches(":disabled") ? 0 : 1),
				arcs: () => [
					{ from: 0, to: 42, color: pick, intensity: (t) => 2.8 * Math.sin(Math.PI * t) },
					{ from: 50, to: 78, color: pick, intensity: (t) => 1 * Math.sin(Math.PI * t) },
				],
			}),
		});
	});

	const styleVars = $derived(
		`--gb-colors: ${colors.join(", ")}; --gb-beam: ${beamGradient(colors)}; --gb-duration: ${duration}ms; --gb-border-width: ${borderWidth}px; --gb-border-radius: ${borderRadius}px; --gb-blur: ${blur}px; --gb-bg-color: ${bgColor}`
	);

	function handleClick(event: MouseEvent) {
		if (sound && !restProps.disabled) soundFx.play("press");
		onclick?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });
	}
</script>

<button
	bind:this={button}
	use:soundFeedback={hoverFeedback}
	class={cn(
		"gradient-button relative flex min-h-10 min-w-28 cursor-pointer items-center justify-center overflow-hidden text-white",
		className
	)}
	style={styleVars}
	onclick={handleClick}
	{...restProps}
>
	<!-- Face and label -->
	<span class="gradient-content inline-flex size-full items-center justify-center px-5 py-2.5">
		{@render children?.()}
	</span>

	<!-- The glow the beam casts inside the face -->
	<span class="gradient-glow" aria-hidden="true"><span></span></span>

	<!-- The beam on the border -->
	<span class="gradient-border" aria-hidden="true"></span>

	{#if hdr && hdrCapable}
		<!-- The beam's light above SDR white, on HDR displays only. -->
		<canvas bind:this={hdrCanvas} class="gradient-hdr" aria-hidden="true"></canvas>
	{/if}
</button>

<style>
	@property --gb-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	.gradient-button {
		border-radius: var(--gb-border-radius);
		isolation: isolate;
		background: color-mix(in srgb, var(--gb-bg-color), #fff 8%);
		animation: gb-spin var(--gb-duration) linear infinite;
		transition: transform 0.2s ease;
	}

	.gradient-hdr {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.gradient-button:active {
		transform: scale(0.98);
	}

	.gradient-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		animation-play-state: paused;
	}

	.gradient-content {
		position: relative;
		margin: var(--gb-border-width);
		border-radius: calc(var(--gb-border-radius) - var(--gb-border-width));
		background:
			linear-gradient(to bottom, rgb(255 255 255 / 0.06), transparent 45%), var(--gb-bg-color);
	}

	.gradient-border,
	.gradient-glow,
	.gradient-glow > span {
		position: absolute;
		pointer-events: none;
		border-radius: inherit;
	}

	/* keep only the padding ring: the element minus its content box */
	.gradient-border,
	.gradient-glow > span {
		background: var(--gb-beam);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
	}

	.gradient-border {
		inset: 0;
		z-index: 2;
		padding: var(--gb-border-width);
	}

	/* A wider band inside the border, blurred by its parent AFTER masking so
	   it falls off softly into the face. Screen: it lights, never darkens. */
	.gradient-glow {
		inset: 0;
		z-index: 1;
		filter: blur(calc(var(--gb-blur) * 3));
		mix-blend-mode: screen;
		opacity: 0.45;
		transition: opacity 0.3s ease;
	}

	.gradient-glow > span {
		inset: 0;
		padding: calc(var(--gb-blur) * 1.75);
	}

	.gradient-button:hover .gradient-glow,
	.gradient-button:focus-visible .gradient-glow {
		opacity: 0.8;
	}

	.gradient-button:focus-visible {
		outline: 2px solid rgb(255 255 255 / 0.5);
		outline-offset: 2px;
	}

	@keyframes gb-spin {
		to {
			--gb-angle: 360deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gradient-button {
			animation: none;
			--gb-angle: 135deg;
		}
	}
</style>
