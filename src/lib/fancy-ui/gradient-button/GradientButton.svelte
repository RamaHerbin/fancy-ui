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
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
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
		...restProps
	}: GradientButtonProps = $props();

	const styleVars = $derived(
		`--gb-colors: ${colors.join(", ")}; --gb-beam: ${beamGradient(colors)}; --gb-duration: ${duration}ms; --gb-border-width: ${borderWidth}px; --gb-border-radius: ${borderRadius}px; --gb-blur: ${blur}px; --gb-bg-color: ${bgColor}`
	);

	function handleClick(event: MouseEvent) {
		if (sound && !restProps.disabled) soundFx.play("press");
		onclick?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });
	}
</script>

<button
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
