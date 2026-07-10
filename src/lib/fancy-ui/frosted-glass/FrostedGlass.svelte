<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";

	interface Props {
		radius?: number;
		baseFrequency?: number;
		numOctaves?: number;
		seed?: number;
		noiseBlur?: number;
		scale?: number;
		tint?: string;
		highlight?: string;
		border?: boolean;
		fallbackBlur?: number;
		fallbackSaturation?: number;
		class?: string;
		containerClass?: string;
		children?: Snippet;
	}

	let {
		radius = 24,
		baseFrequency = 0.008,
		numOctaves = 2,
		seed = 92,
		noiseBlur = 2,
		scale = 70,
		tint = "hsla(0, 0%, 100%, 0.25)",
		highlight = "hsla(0, 0%, 100%, 0.75)",
		border = true,
		fallbackBlur = 20,
		fallbackSaturation = 180,
		class: className = "",
		containerClass = "",
		children,
	}: Props = $props();

	let filterId = $state("");

	let containerStyle = $derived(
		`border-radius:${radius}px;--fg-tint:${tint};--fg-highlight:${highlight};` +
			`--fg-fallback-blur:${fallbackBlur}px;--fg-fallback-saturation:${fallbackSaturation}%;`
	);

	onMount(() => {
		filterId = `fg-dist-${Math.random().toString(36).slice(2, 8)}`;
	});
</script>

<div
	class={cn("frosted-glass", border && "frosted-glass-border", containerClass)}
	style={containerStyle}
>
	{#if filterId}
		<div class="frosted-glass-filter" style="filter:url(#{filterId});"></div>

		<svg class="frosted-glass-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<defs>
				<filter
					id={filterId}
					x="-50%"
					y="-50%"
					width="200%"
					height="200%"
					filterUnits="objectBoundingBox"
					primitiveUnits="userSpaceOnUse"
					color-interpolation-filters="linearRGB"
				>
					<feTurbulence
						type="fractalNoise"
						baseFrequency="{baseFrequency} {baseFrequency}"
						{numOctaves}
						{seed}
						stitchTiles="stitch"
						result="noise"
					/>
					<feGaussianBlur in="noise" stdDeviation={noiseBlur} result="blurred" />
					<feDisplacementMap
						in="SourceGraphic"
						in2="blurred"
						{scale}
						xChannelSelector="R"
						yChannelSelector="G"
					/>
				</filter>
			</defs>
		</svg>
	{/if}

	<div class="frosted-glass-overlay"></div>
	<div class="frosted-glass-specular"></div>

	<div class={cn("frosted-glass-content", className)}>
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.frosted-glass {
		position: relative;
		display: flex;
		background: transparent;
		overflow: hidden;
		contain: layout paint;
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.1),
			0 0 8px rgba(0, 0, 0, 0.05);
	}

	.frosted-glass-border::before {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 4;
		border-radius: inherit;
		padding: 1px;
		background:
			conic-gradient(
				from -75deg at 50% 50%,
				rgba(20, 60, 120, 0.5),
				rgba(150, 200, 255, 0.1) 5% 40%,
				rgba(20, 60, 120, 0.5) 50%,
				rgba(150, 200, 255, 0.1) 60% 95%,
				rgba(20, 60, 120, 0.5)
			),
			linear-gradient(180deg, rgba(220, 240, 255, 0.5), rgba(240, 250, 255, 0.5));
		box-shadow: inset 0 0 0 0.5px rgba(220, 240, 255, 0.5);
		pointer-events: none;
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask-composite: exclude;
	}

	/* backdrop-filter: blur(0) pulls the backdrop into this layer so the SVG
	   displacement filter can distort it */
	.frosted-glass-filter {
		position: absolute;
		inset: 0;
		z-index: 0;
		backdrop-filter: blur(0);
		isolation: isolate;
		transform: translateZ(0);
		will-change: filter;
		animation: frosted-glass-settle 0.22s ease-out;
	}

	@keyframes frosted-glass-settle {
		0% {
			opacity: 0;
		}
	}

	/* Safari can't combine filter:url() with backdrop-filter — fall back to
	   plain frosted blur */
	@supports (-webkit-hyphens: none) {
		.frosted-glass-filter {
			filter: none !important;
			backdrop-filter: blur(var(--fg-fallback-blur)) saturate(var(--fg-fallback-saturation));
		}

		.frosted-glass-overlay {
			background: hsla(0, 0%, 100%, 0.5);
		}
	}

	.frosted-glass-defs {
		position: absolute;
		width: 0;
		height: 0;
	}

	.frosted-glass-overlay {
		position: absolute;
		inset: 0;
		z-index: 1;
		background: var(--fg-tint);
	}

	.frosted-glass-specular {
		position: absolute;
		inset: 0;
		z-index: 2;
		border-radius: inherit;
		overflow: hidden;
		box-shadow:
			inset 1px 1px 0 var(--fg-highlight),
			inset 0 0 5px var(--fg-highlight);
	}

	.frosted-glass-content {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: center;
		width: 100%;
	}
</style>
