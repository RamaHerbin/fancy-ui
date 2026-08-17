<!--
	The FancyUI brand mark: a four-pointed sparkle, pink through violet to cyan,
	with an emissive rim. Kept in step with `static/favicon.svg` (the source the
	brand-asset pipeline rasterizes) and with `AnimatedFavicon.svelte` (which
	re-emits the same mark as favicon frames). Change one, change all three.
-->
<script lang="ts">
	import { cn } from "$lib/utils";
	import type { SVGAttributes } from "svelte/elements";

	type Props = Omit<SVGAttributes<SVGSVGElement>, "class"> & {
		/** Rendered edge length in px. The mark is square. */
		size?: number;
		/** Outer halo. Turn it off where the mark sits inside a tight frame. */
		glow?: boolean;
		/** Slow scale/opacity twinkle. Ignored under prefers-reduced-motion. */
		animated?: boolean;
		/** Accessible name. Omit where adjacent text already names the brand. */
		title?: string;
		class?: string;
	};

	let {
		size = 24,
		glow = true,
		animated = false,
		title,
		class: className,
		...rest
	}: Props = $props();

	// Gradients and filters resolve by document-global id, so two logos on one
	// page would share -- or steal -- each other's paint servers. One id prefix
	// per instance keeps them independent.
	const uid = $props.id();

	const d = "M16 3Q16.7 15.3 29 16Q16.7 16.7 16 29Q15.3 16.7 3 16Q15.3 15.3 16 3Z";
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 32 32"
	width={size}
	height={size}
	class={cn("shrink-0", className)}
	role={title ? "img" : undefined}
	aria-label={title}
	aria-hidden={title ? undefined : "true"}
	{...rest}
>
	{#if title}
		<title>{title}</title>
	{/if}

	<defs>
		<path id="{uid}-mk" {d} />

		<linearGradient id="{uid}-spark" x1="0" y1="0.5" x2="1" y2="0.5">
			<stop offset="0" stop-color="#d22374" />
			<stop offset="0.25" stop-color="#fd4ba0" />
			<stop offset="0.375" stop-color="#c128c1" />
			<stop offset="0.44" stop-color="#9624dd" />
			<stop offset="0.5" stop-color="#6f27f7" />
			<stop offset="0.5625" stop-color="#512df7" />
			<stop offset="0.625" stop-color="#4537f7" />
			<stop offset="0.75" stop-color="#487df9" />
			<stop offset="0.875" stop-color="#71e8fc" />
			<stop offset="1" stop-color="#8ff0fe" />
		</linearGradient>

		<linearGradient id="{uid}-verts" x1="0.5" y1="0" x2="0.5" y2="1">
			<stop offset="0" stop-color="#faebfd" stop-opacity="0.92" />
			<stop offset="0.125" stop-color="#fba4fb" stop-opacity="0.88" />
			<stop offset="0.27" stop-color="#cd50fb" stop-opacity="0.6" />
			<stop offset="0.4" stop-color="#912ffa" stop-opacity="0" />
			<stop offset="0.6" stop-color="#8322f8" stop-opacity="0" />
			<stop offset="0.73" stop-color="#bf2ffa" stop-opacity="0.6" />
			<stop offset="0.875" stop-color="#fc72fb" stop-opacity="0.88" />
			<stop offset="1" stop-color="#fdd8fd" stop-opacity="0.92" />
		</linearGradient>

		<linearGradient id="{uid}-rim" x1="0.12" y1="0" x2="0.88" y2="1">
			<stop offset="0" stop-color="#ffe2f2" stop-opacity="1" />
			<stop offset="0.3" stop-color="#ffffff" stop-opacity="0.92" />
			<stop offset="0.62" stop-color="#dcefff" stop-opacity="0.45" />
			<stop offset="1" stop-color="#8fd9ff" stop-opacity="0.14" />
		</linearGradient>

		<radialGradient id="{uid}-tips" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
			<stop offset="1" stop-color="#ffffff" stop-opacity="0.8" />
		</radialGradient>

		<filter id="{uid}-halo" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="2.2" />
		</filter>
		<filter id="{uid}-bloom" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="0.8" />
		</filter>
		<filter id="{uid}-softRim" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="0.45" />
		</filter>
	</defs>

	<g class:mark={animated} style:transform-origin="16px 16px">
		{#if glow}
			<use href="#{uid}-mk" fill="url(#{uid}-spark)" filter="url(#{uid}-halo)" opacity="0.8" />
		{/if}
		<use href="#{uid}-mk" fill="url(#{uid}-spark)" filter="url(#{uid}-bloom)" opacity="0.85" />
		<use href="#{uid}-mk" fill="url(#{uid}-spark)" />
		<use href="#{uid}-mk" fill="url(#{uid}-verts)" />
		<use href="#{uid}-mk" fill="url(#{uid}-tips)" />
		<use
			href="#{uid}-mk"
			fill="none"
			stroke="url(#{uid}-rim)"
			stroke-width="1.2"
			opacity="0.55"
			filter="url(#{uid}-softRim)"
		/>
		<use href="#{uid}-mk" fill="none" stroke="url(#{uid}-rim)" stroke-width="0.28" opacity="0.72" />
	</g>
</svg>

<style>
	/* Gentler and slower than the twinkle in `static/favicon.svg`, on purpose:
	   that one has to carry at 16px in a browser tab, this one renders at 20-26px
	   next to the wordmark, where the same amplitude would read as a flicker. */
	.mark {
		animation: twinkle 3s ease-in-out infinite;
	}

	@keyframes twinkle {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(0.94);
			opacity: 0.88;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mark {
			animation: none;
		}
	}
</style>
