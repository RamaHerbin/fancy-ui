<script lang="ts" module>
	/**
	 * BorderBeam - Animated beam effect that travels around the border
	 *
	 * Place inside a container with `position: relative` and `overflow: hidden`.
	 * The beam will animate around the container's border.
	 */
	export interface BorderBeamProps {
		/** Additional CSS classes */
		class?: string;
		/** Size of the beam in pixels */
		size?: number;
		/** Animation duration in seconds */
		duration?: number;
		/** Border width in pixels */
		borderWidth?: number;
		/** Anchor position (0-100) */
		anchor?: number;
		/** Gradient start color */
		colorFrom?: string;
		/** Gradient end color */
		colorTo?: string;
		/** Animation delay in seconds */
		delay?: number;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		size = 200,
		duration = 15,
		borderWidth = 1.5,
		anchor = 90,
		colorFrom = '#ffaa40',
		colorTo = '#9c40ff',
		delay = 0
	}: BorderBeamProps = $props();

	const style = $derived(
		[
			`--border-beam-size: ${size}`,
			`--border-beam-duration: ${duration}s`,
			`--border-beam-anchor: ${anchor}`,
			`--border-beam-border-width: ${borderWidth}`,
			`--border-beam-color-from: ${colorFrom}`,
			`--border-beam-color-to: ${colorTo}`,
			`--border-beam-delay: ${delay}s`
		].join(';')
	);
</script>

<div
	class={cn(
		'border-beam',
		'pointer-events-none absolute inset-0 rounded-[inherit]',
		'[border:calc(var(--border-beam-border-width)*1px)_solid_transparent]',
		'![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',
		'after:absolute after:aspect-square after:w-[calc(var(--border-beam-size)*1px)]',
		'after:[animation-delay:var(--border-beam-delay)]',
		'after:[background:linear-gradient(to_left,var(--border-beam-color-from),var(--border-beam-color-to),transparent)]',
		'after:[offset-anchor:calc(var(--border-beam-anchor)*1%)_50%]',
		'after:[offset-path:rect(0_auto_auto_0_round_calc(var(--border-beam-size)*1px))]',
		className
	)}
	{style}
></div>

<style>
	.border-beam::after {
		content: '';
		animation: border-beam-animation var(--border-beam-duration) infinite linear;
	}

	@keyframes border-beam-animation {
		0% {
			offset-distance: 0%;
		}
		100% {
			offset-distance: 100%;
		}
	}
</style>
