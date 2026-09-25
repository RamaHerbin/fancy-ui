<script lang="ts" module>
	/**
	 * Meteors - Animated meteor shower effect
	 *
	 * A seeded field of meteors, each at its own depth: near ones are larger,
	 * brighter, longer-tailed and faster, far ones faint and slow, so the
	 * shower reads in parallax. Each meteor fades in, streaks across on a
	 * diagonal and burns out; a few flare before they go.
	 */
	export interface MeteorsProps {
		/** Number of meteors to render */
		count?: number;
		/** Additional CSS classes applied to each meteor */
		class?: string;
		/** Direction of travel, in degrees (215 = down and to the right) */
		angle?: number;
		/** Speed multiplier: 2 is twice as fast */
		speed?: number;
		/** Head and tail colour. Defaults to a pale blue-white on dark pages, slate on light ones */
		color?: string;
		/** Seed for the field — same seed, same shower (and the same markup on server and client) */
		seed?: number;
	}

	export interface Meteor {
		/** Start position, % of the container */
		left: number;
		top: number;
		/** 0 (far) to 1 (near) */
		depth: number;
		/** Seconds for one pass */
		duration: number;
		/** Negative start offset, so the shower is already under way */
		delay: number;
		/** Whether this one flares before it burns out */
		flare: boolean;
	}

	/** Small seedable PRNG. Same seed → same sequence, on the server and in the browser. */
	function mulberry32(seed: number): () => number {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/**
	 * The shower. Starts reach well past the left edge (meteors drift right
	 * as they fall, so a start on the left is what fills the left half) and
	 * over the upper part of the height; depth skewed toward far, the way a
	 * real sky has many faint meteors and few bright ones.
	 */
	export function meteorField(count: number, seed = 1): Meteor[] {
		const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
		const rand = mulberry32(seed);
		return Array.from({ length: n }, () => {
			const depth = Math.pow(rand(), 1.6);
			const duration = 7 - depth * 4.5 + rand() * 1.5; // near: ~2.5–4s, far: ~7–8.5s
			return {
				left: -50 + rand() * 150,
				top: -30 + rand() * 60,
				depth,
				duration,
				delay: -rand() * duration * 1.6,
				flare: rand() < 0.2,
			};
		});
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		count = 20,
		class: className,
		angle = 215,
		speed = 1,
		color,
		seed = 1,
	}: MeteorsProps = $props();

	const meteors = $derived(meteorField(count, seed));
	const speedC = $derived(Number.isFinite(speed) && speed > 0 ? speed : 1);
	const angleC = $derived(Number.isFinite(angle) ? angle : 215);

	function styleFor(m: Meteor): string {
		const scale = 0.55 + m.depth * 0.9; // size of the head
		const tail = Math.round(40 + m.depth * 110); // px
		const brightness = (0.35 + m.depth * 0.65).toFixed(2);
		return [
			`left:${m.left.toFixed(2)}%`,
			`top:${m.top.toFixed(2)}%`,
			`animation-delay:${(m.delay / speedC).toFixed(2)}s`,
			`animation-duration:${(m.duration / speedC).toFixed(2)}s`,
			`--meteor-angle:${angleC}deg`,
			`--meteor-scale:${scale.toFixed(2)}`,
			`--meteor-tail:${tail}px`,
			`--meteor-brightness:${brightness}`,
			`--meteor-travel:${Math.round(700 + m.depth * 500)}px`,
			color ? `--meteor-color:${color}` : "",
		]
			.filter(Boolean)
			.join(";");
	}
</script>

{#each meteors as meteor, i (i)}
	<span
		class={cn(
			"meteor pointer-events-none absolute top-0 h-0.5 w-0.5 rounded-full opacity-0",
			meteor.flare && "meteor--flare",
			className
		)}
		style={styleFor(meteor)}
		aria-hidden="true"
	></span>
{/each}

<style>
	/* Light pages get a slate meteor; dark ones a pale blue-white. A `color`
	   prop (inline) overrides both. */
	.meteor {
		--_meteor-color: var(--meteor-color, #475569);
		background: var(--_meteor-color);
		transform: rotate(var(--meteor-angle, 215deg)) scale(var(--meteor-scale, 1));
		/* the head's glow */
		box-shadow:
			0 0 2px 1px color-mix(in srgb, var(--_meteor-color) 70%, transparent),
			0 0 8px 2px color-mix(in srgb, var(--_meteor-color) 35%, transparent);
		animation: meteor-fall 5s cubic-bezier(0.3, 0, 0.9, 1) infinite;
	}

	:global(.dark) .meteor {
		--_meteor-color: var(--meteor-color, #dbeafe);
	}

	/* The tail: thickest at the head, fading out behind it. */
	.meteor::before {
		content: "";
		position: absolute;
		top: 50%;
		left: 1px;
		width: var(--meteor-tail, 60px);
		height: 1px;
		transform: translateY(-50%);
		border-radius: 999px;
		background: linear-gradient(
			to right,
			var(--_meteor-color),
			color-mix(in srgb, var(--_meteor-color) 35%, transparent) 30%,
			transparent
		);
	}

	@keyframes meteor-fall {
		0% {
			transform: rotate(var(--meteor-angle, 215deg)) scale(var(--meteor-scale, 1)) translateX(0);
			opacity: 0;
		}
		8% {
			opacity: var(--meteor-brightness, 1);
		}
		70% {
			opacity: var(--meteor-brightness, 1);
		}
		100% {
			transform: rotate(var(--meteor-angle, 215deg)) scale(var(--meteor-scale, 1))
				translateX(calc(-1 * var(--meteor-travel, 800px)));
			opacity: 0;
		}
	}

	/* A flare: the meteor swells and brightens just before it burns out. */
	.meteor--flare {
		animation-name: meteor-fall-flare;
	}

	@keyframes meteor-fall-flare {
		0% {
			transform: rotate(var(--meteor-angle, 215deg)) scale(var(--meteor-scale, 1)) translateX(0);
			opacity: 0;
		}
		8% {
			opacity: var(--meteor-brightness, 1);
		}
		62% {
			opacity: var(--meteor-brightness, 1);
			box-shadow:
				0 0 2px 1px color-mix(in srgb, var(--_meteor-color) 70%, transparent),
				0 0 8px 2px color-mix(in srgb, var(--_meteor-color) 35%, transparent);
		}
		74% {
			opacity: 1;
			box-shadow:
				0 0 4px 2px var(--_meteor-color),
				0 0 18px 6px color-mix(in srgb, var(--_meteor-color) 55%, transparent);
		}
		100% {
			transform: rotate(var(--meteor-angle, 215deg)) scale(var(--meteor-scale, 1))
				translateX(calc(-1 * var(--meteor-travel, 800px)));
			opacity: 0;
		}
	}

	/* Reduced motion: a still sky — each meteor frozen part-way along its path. */
	@media (prefers-reduced-motion: reduce) {
		.meteor,
		.meteor--flare {
			animation: none;
			opacity: calc(var(--meteor-brightness, 1) * 0.7);
			transform: rotate(var(--meteor-angle, 215deg)) scale(var(--meteor-scale, 1))
				translateX(calc(-0.35 * var(--meteor-travel, 800px)));
		}
	}
</style>
