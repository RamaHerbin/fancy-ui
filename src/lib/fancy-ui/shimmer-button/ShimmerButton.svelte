<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type BaseProps = {
		/** Colour of the sheen */
		shimmerColor?: string;
		/** Thickness of the rim the sheen glints on */
		shimmerSize?: string;
		/** Button border radius */
		borderRadius?: string;
		/** Duration of one sheen cycle: the sweep, then a pause */
		shimmerDuration?: string;
		/** Button background color */
		background?: string;
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
		 * Beta, off by default. On a display that reports HDR, add a glint above SDR white to the
		 * sweep and the hover spot, in a WebGPU layer with extended tone mapping.
		 * Elsewhere nothing changes.
		 */
		hdr?: boolean;
	};

	export type ShimmerButtonProps = BaseProps & Omit<HTMLButtonAttributes, keyof BaseProps>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { soundFeedback } from "../sound/sound-feedback.js";
	import { attachHdrLight, hdrLightAvailable } from "../_internals/hdr/hdr-light.js";
	import { createShimmerProbe } from "./shimmer-button-hdr.js";

	let button: HTMLButtonElement | undefined = $state();
	let sheen: HTMLSpanElement | undefined = $state();
	let hdrCanvas: HTMLCanvasElement | undefined = $state();
	// Rendered only on a device that can use it: no extra DOM on SDR displays.
	let hdrCapable = $state(false);
	$effect(() => {
		hdrCapable = hdrLightAvailable();
	});

	let {
		class: className,
		shimmerColor = "#ffffff",
		shimmerSize = "0.05em",
		borderRadius = "100px",
		shimmerDuration = "3s",
		background = "rgba(0, 0, 0, 1)",
		children,
		onclick,
		onpointermove,
		sound = false,
		hdr = false,
		...restProps
	}: ShimmerButtonProps = $props();

	// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
	// off (and never the default click → press, which `handleClick` already plays).
	const hoverFeedback = $derived({
		on: sound ? { pointerenter: "hover" as const } : ({} as Record<string, never>),
		disabled: !!restProps.disabled,
	});

	const styleVars = $derived(
		`--shimmer-color: ${shimmerColor}; --radius: ${borderRadius}; --speed: ${shimmerDuration}; --cut: ${shimmerSize}; --bg: ${background}`
	);

	function handleClick(event: MouseEvent) {
		if (sound && !restProps.disabled) soundFx.play("press");
		onclick?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });
	}

	$effect(() => {
		if (!button || !sheen || !hdrCanvas) return;
		return attachHdrLight({
			host: button,
			canvas: hdrCanvas,
			pad: 0,
			probe: createShimmerProbe(button, sheen, () => ({ color: shimmerColor })),
		});
	});

	// The hover sheen follows the pointer: two CSS variables, no re-render.
	function handlePointerMove(event: PointerEvent) {
		const el = event.currentTarget as HTMLButtonElement;
		const rect = el.getBoundingClientRect();
		el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
		el.style.setProperty("--my", `${event.clientY - rect.top}px`);
		onpointermove?.(event as PointerEvent & { currentTarget: EventTarget & HTMLButtonElement });
	}
</script>

<button
	use:soundFeedback={hoverFeedback}
	bind:this={button}
	class={cn(
		"shimmer-button group relative isolate flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] px-6 py-3 whitespace-nowrap text-white/90",
		"transform-gpu duration-300 ease-out hover:text-white active:scale-[0.98] transition-[color] motion-safe:transition-[transform,color]",
		className
	)}
	style={styleVars}
	onclick={handleClick}
	onpointermove={handlePointerMove}
	{...restProps}
>
	<!-- Rim: shows around the face, catches the sheen as it passes -->
	<span class="shimmer-button__rim" aria-hidden="true"></span>

	<!-- Face -->
	<span class="shimmer-button__face" aria-hidden="true"></span>

	<!-- Content -->
	<span class="relative z-10">{@render children?.()}</span>

	<!-- Sweep: a satin band that crosses the button, then rests -->
	<span bind:this={sheen} class="shimmer-button__sheen" aria-hidden="true"></span>

	<!-- Hover: the sheen follows the pointer -->
	<span class="shimmer-button__spot" aria-hidden="true"></span>

	{#if hdr && hdrCapable}
		<!-- Glint above SDR white, on HDR displays only. -->
		<canvas bind:this={hdrCanvas} class="shimmer-button__hdr" aria-hidden="true"></canvas>
	{/if}
</button>

<style>
	.shimmer-button__rim,
	.shimmer-button__face,
	.shimmer-button__sheen,
	.shimmer-button__spot {
		position: absolute;
		pointer-events: none;
		border-radius: inherit;
	}

	.shimmer-button__rim {
		inset: 0;
		z-index: -2;
		background: linear-gradient(
			to bottom,
			color-mix(in srgb, var(--shimmer-color) 28%, transparent),
			color-mix(in srgb, var(--shimmer-color) 6%, transparent) 55%,
			color-mix(in srgb, var(--shimmer-color) 14%, transparent)
		);
	}

	.shimmer-button__face {
		inset: var(--cut);
		z-index: -1;
		border-radius: calc(var(--radius) - var(--cut));
		background:
			linear-gradient(
				to bottom,
				color-mix(in srgb, var(--shimmer-color) 10%, transparent),
				transparent 50%
			),
			var(--bg);
		box-shadow: inset 0 -10px 16px -12px color-mix(in srgb, var(--shimmer-color) 30%, transparent);
	}

	/* Screen blend: the band lightens the face and lifts the label to full white. */
	.shimmer-button__sheen {
		inset: 0;
		z-index: 20;
		mix-blend-mode: screen;
		/* a wide soft halo with a thin brighter core */
		background:
			linear-gradient(
				108deg,
				transparent 44%,
				color-mix(in srgb, var(--shimmer-color) 38%, transparent) 50%,
				transparent 56%
			),
			linear-gradient(
				108deg,
				transparent 30%,
				color-mix(in srgb, var(--shimmer-color) 12%, transparent) 42%,
				color-mix(in srgb, var(--shimmer-color) 18%, transparent) 50%,
				color-mix(in srgb, var(--shimmer-color) 12%, transparent) 58%,
				transparent 70%
			);
		background-size: 250% 100%;
		background-repeat: no-repeat;
		background-position: 100% 0;
		animation: shimmer-sweep var(--speed) cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	.shimmer-button__hdr {
		position: absolute;
		inset: 0;
		z-index: 21;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.shimmer-button__spot {
		inset: 0;
		z-index: 20;
		mix-blend-mode: screen;
		opacity: 0;
		background: radial-gradient(
			90px circle at var(--mx, 50%) var(--my, 50%),
			color-mix(in srgb, var(--shimmer-color) 34%, transparent),
			transparent 70%
		);
	}

	.shimmer-button:hover .shimmer-button__spot {
		opacity: 1;
	}

	/* The pointer takes over from the sweep while hovering. */
	.shimmer-button:hover .shimmer-button__sheen {
		opacity: 0;
	}

	.shimmer-button:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--shimmer-color) 70%, transparent);
		outline-offset: 2px;
	}

	.shimmer-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.shimmer-button:disabled .shimmer-button__sheen,
	.shimmer-button:disabled .shimmer-button__spot {
		display: none;
	}

	/* Sweep across in the first 55% of the cycle, then rest off-button. */
	@keyframes shimmer-sweep {
		0% {
			background-position: 100% 0;
		}
		55%,
		100% {
			background-position: 0% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shimmer-button__sheen {
			animation: none;
			background-position: 38% 0;
			opacity: 0.6;
		}
	}

	/* The fade is motion: it only runs when the visitor has not asked for less. */
	@media (prefers-reduced-motion: no-preference) {
		.shimmer-button__sheen {
			transition: opacity 0.3s ease;
		}
		.shimmer-button__spot {
			transition: opacity 0.3s ease;
		}
	}
</style>
