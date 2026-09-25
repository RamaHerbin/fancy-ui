<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * NeonBorder - a two-colour neon tube around its content
	 *
	 * A faint tube runs all the way round; two beams, one per colour, chase
	 * each other along it from opposite sides. Each beam has a white-hot core
	 * and a coloured glow that spills both inside and outside the edge. The
	 * glow hums (a slow breathing), and the tube flickers once as it ignites.
	 */
	export interface NeonBorderProps {
		/** First neon color */
		color1?: string;
		/** Second neon color */
		color2?: string;
		/**
		 * How much of the tube is lit: none (two short beams, static), half
		 * (two short beams chasing), full (two long beams that nearly close the ring)
		 */
		animationType?: "none" | "half" | "full";
		/** Time for the beams to travel once around, in seconds */
		duration?: number;
		/** Additional CSS classes */
		class?: string;
		/** Content */
		children?: Snippet;
	}

	export type NeonAnimationType = NonNullable<NeonBorderProps["animationType"]>;

	/** Share of the turn each beam covers, in %. */
	export function beamArc(type: NeonAnimationType): number {
		return type === "full" ? 46 : 22;
	}

	/**
	 * The static tube (`animationType="none"`): lit at two opposite corners,
	 * the first colour top-left and the second bottom-right.
	 */
	export function neonCorners(color1: string, color2: string, core = false): string {
		const tint = (c: string) => (core ? `color-mix(in srgb, ${c} 45%, #fff)` : c);
		return `linear-gradient(135deg, ${tint(color1)} 0%, transparent 32%, transparent 68%, ${tint(color2)} 100%)`;
	}

	/**
	 * The two beams as one conic gradient: each fades in from its tail and
	 * cuts off sharply at its head, the second half a turn behind the first.
	 * `core` whitens each colour for the hot centre of the tube.
	 */
	export function neonBeams(color1: string, color2: string, arc: number, core = false): string {
		const tint = (c: string) => (core ? `color-mix(in srgb, ${c} 45%, #fff)` : c);
		const beam = (c: string, from: number) => {
			const head = from + arc;
			return [
				`transparent ${from}%`,
				`color-mix(in srgb, ${tint(c)} 55%, transparent) ${(from + arc * 0.45).toFixed(1)}%`,
				`${tint(c)} ${(head - 0.6).toFixed(1)}%`,
				`transparent ${head.toFixed(1)}%`,
			].join(", ");
		};
		return `conic-gradient(from var(--neon-angle), ${beam(color1, 0)}, ${beam(color2, 50)}, transparent 100%)`;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		color1 = "#0496ff",
		color2 = "#ff0a54",
		animationType = "half",
		duration = 6,
		class: className,
		children,
	}: NeonBorderProps = $props();

	function getWidth(type: NeonAnimationType): number {
		switch (type) {
			case "none":
				return 12;
			case "half":
				return 50;
			case "full":
				return 100;
		}
	}

	const arc = $derived(beamArc(animationType));
	const animated = $derived(animationType !== "none");

	const styleVars = $derived(
		[
			`--neon-duration: ${duration}s`,
			`--neon-color1: ${color1}`,
			`--neon-color2: ${color2}`,
			`--neon-width: ${getWidth(animationType)}%`,
			`--neon-beams: ${animated ? neonBeams(color1, color2, arc) : neonCorners(color1, color2)}`,
			`--neon-core: ${animated ? neonBeams(color1, color2, arc, true) : neonCorners(color1, color2, true)}`,
		].join("; ")
	);
</script>

<div
	class={cn(
		"neon-border-container relative z-10 inline-block h-10 w-full max-w-sm rounded-lg p-px",
		animated && "neon-animated",
		className
	)}
	style={styleVars}
>
	{@render children?.()}

	<span class="neon-tube" aria-hidden="true"></span>
	<span class="neon-light" aria-hidden="true">
		<span class="neon-glow"><span></span></span>
		<span class="neon-core"></span>
	</span>
</div>

<style>
	@property --neon-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 135deg;
	}

	.neon-border-container {
		--neon-tube-width: 1.5px;
		padding: var(--neon-tube-width);
		isolation: isolate;
	}

	.neon-tube,
	.neon-light,
	.neon-glow,
	.neon-glow > span,
	.neon-core {
		position: absolute;
		pointer-events: none;
		border-radius: inherit;
	}

	/* keep only the padding ring: the element minus its content box */
	.neon-tube,
	.neon-glow > span,
	.neon-core {
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
	}

	/* The unlit tube: always there, faint, shading from one colour to the other. */
	.neon-tube {
		inset: 0;
		padding: var(--neon-tube-width);
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--neon-color1) 30%, transparent),
			color-mix(in srgb, var(--neon-color2) 30%, transparent)
		);
	}

	.neon-light {
		inset: 0;
	}

	/* The glow: the beams on a wide ring straddling the edge, blurred after
	   masking so it spills softly both inside and outside. */
	.neon-glow {
		inset: 0;
		filter: blur(7px);
		/* on a light page a coloured halo reads as a stain: keep it faint */
		opacity: var(--neon-glow-max);
	}

	.neon-border-container {
		--neon-glow-max: 0.4;
		--neon-glow-min: 0.25;
	}

	:global(.dark) .neon-border-container {
		--neon-glow-max: 0.9;
		--neon-glow-min: 0.6;
	}

	.neon-glow > span {
		inset: -7px;
		padding: calc(var(--neon-tube-width) + 12px);
		border-radius: calc(0.5rem + 7px);
		background: var(--neon-beams);
	}

	/* The white-hot core of the lit tube. */
	.neon-core {
		inset: 0;
		padding: var(--neon-tube-width);
		background: var(--neon-core);
	}

	@media (prefers-reduced-motion: no-preference) {
		/* The beams chase round the tube. */
		.neon-animated {
			animation: neon-travel var(--neon-duration) linear infinite;
		}

		/* The tube strikes once on first paint… */
		.neon-light {
			animation: neon-ignite 0.9s steps(1, end) both;
		}

		/* …then hums: a slow breathing of the glow. */
		.neon-glow {
			animation: neon-hum 2.8s ease-in-out 0.9s infinite alternate;
		}
	}

	@keyframes neon-travel {
		from {
			--neon-angle: 135deg;
		}
		to {
			--neon-angle: 495deg;
		}
	}

	@keyframes neon-ignite {
		0% {
			opacity: 0;
		}
		10% {
			opacity: 0.8;
		}
		18% {
			opacity: 0.1;
		}
		30% {
			opacity: 1;
		}
		40% {
			opacity: 0.35;
		}
		52% {
			opacity: 1;
		}
		100% {
			opacity: 1;
		}
	}

	@keyframes neon-hum {
		from {
			opacity: var(--neon-glow-max);
		}
		to {
			opacity: var(--neon-glow-min);
		}
	}
</style>
