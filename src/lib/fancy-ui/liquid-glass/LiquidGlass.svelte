<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";

	interface Props {
		radius?: number;
		border?: number;
		lightness?: number;
		displace?: number;
		blend?: string;
		xChannel?: "R" | "G" | "B";
		yChannel?: "R" | "G" | "B";
		alpha?: number;
		blur?: number;
		rOffset?: number;
		gOffset?: number;
		bOffset?: number;
		scale?: number;
		frost?: number;
		/** Backdrop blur in pixels for the Safari fallback */
		fallbackBlur?: number;
		/** Backdrop saturation percentage for the Safari fallback */
		fallbackSaturation?: number;
		class?: string;
		containerClass?: string;
		children?: Snippet;
	}

	let {
		radius = 16,
		border: borderProp = 0.07,
		lightness = 50,
		displace,
		blend = "difference",
		xChannel = "R",
		yChannel = "B",
		alpha = 0.93,
		blur = 11,
		rOffset = 0,
		gOffset = 10,
		bOffset = 20,
		scale = -180,
		frost = 0.05,
		fallbackBlur = 20,
		fallbackSaturation = 180,
		class: className = "",
		containerClass = "",
		children,
	}: Props = $props();

	let liquidGlassRoot: HTMLDivElement;
	let dimensions = $state({ width: 0, height: 0 });
	let filterId = $state("");

	let displacementImage = $derived.by(() => {
		const brd = Math.min(dimensions.width, dimensions.height) * (borderProp * 0.5);

		return `<svg viewBox="0 0 ${dimensions.width} ${dimensions.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="red-${filterId}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient><linearGradient id="blue-${filterId}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs><rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" fill="black"/><rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" rx="${radius}" fill="url(#red-${filterId})"/><rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" rx="${radius}" fill="url(#blue-${filterId})" style="mix-blend-mode:${blend}"/><rect x="${brd}" y="${brd}" width="${dimensions.width - brd * 2}" height="${dimensions.height - brd * 2}" rx="${radius}" fill="hsl(0 0% ${lightness}% / ${alpha})" style="filter:blur(${blur}px)"/></svg>`;
	});

	let displacementDataUri = $derived(`data:image/svg+xml,${encodeURIComponent(displacementImage)}`);

	let backdropStyle = $derived(
		filterId
			? `--frost:${frost};border-radius:${radius}px;backdrop-filter:url(#displacementFilter-${filterId});--lg-fallback-blur:${fallbackBlur}px;--lg-fallback-saturation:${fallbackSaturation}%;`
			: `--frost:${frost};border-radius:${radius}px;--lg-fallback-blur:${fallbackBlur}px;--lg-fallback-saturation:${fallbackSaturation}%;`
	);

	onMount(() => {
		filterId = `lg-${Math.random().toString(36).slice(2, 8)}`;

		if (!liquidGlassRoot) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;

			let width = 0;
			let height = 0;

			if (entry.borderBoxSize && entry.borderBoxSize.length) {
				width = entry.borderBoxSize[0]!.inlineSize;
				height = entry.borderBoxSize[0]!.blockSize;
			} else if (entry.contentRect) {
				width = entry.contentRect.width;
				height = entry.contentRect.height;
			}

			dimensions = { width, height };
		});

		observer.observe(liquidGlassRoot);

		return () => observer.disconnect();
	});
</script>

<div
	bind:this={liquidGlassRoot}
	class={cn("liquid-glass-effect", containerClass)}
	style={backdropStyle}
>
	<div class={cn("liquid-glass-slot", className)}>
		{#if children}
			{@render children()}
		{/if}
	</div>

	{#if filterId}
		<svg class="liquid-glass-filter" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<filter id="displacementFilter-{filterId}" color-interpolation-filters="sRGB">
					<feImage x="0" y="0" width="100%" height="100%" href={displacementDataUri} result="map" />
					<feDisplacementMap
						in="SourceGraphic"
						in2="map"
						xChannelSelector={xChannel}
						yChannelSelector={yChannel}
						scale={scale + rOffset}
						result="dispRed"
					/>
					<feColorMatrix
						in="dispRed"
						type="matrix"
						values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
						result="red"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="map"
						xChannelSelector={xChannel}
						yChannelSelector={yChannel}
						scale={scale + gOffset}
						result="dispGreen"
					/>
					<feColorMatrix
						in="dispGreen"
						type="matrix"
						values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
						result="green"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="map"
						xChannelSelector={xChannel}
						yChannelSelector={yChannel}
						scale={scale + bOffset}
						result="dispBlue"
					/>
					<feColorMatrix
						in="dispBlue"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
						result="blue"
					/>
					<feBlend in="red" in2="green" mode="screen" result="rg" />
					<feBlend in="rg" in2="blue" mode="screen" result="output" />
					{#if displace !== undefined}
						<feGaussianBlur stdDeviation={displace} />
					{/if}
				</filter>
			</defs>
		</svg>
	{/if}
</div>

<style>
	.liquid-glass-effect {
		position: relative;
		display: block;
		opacity: 1;
		border-radius: inherit;
		background: light-dark(hsl(0 0% 100% / var(--frost, 0)), hsl(0 0% 0% / var(--frost, 0)));
		box-shadow:
			0 0 2px 1px
				light-dark(
					color-mix(in oklch, canvasText, #0000 85%),
					color-mix(in oklch, canvasText, #0000 90%)
				)
				inset,
			0 0 10px 4px
				light-dark(
					color-mix(in oklch, canvasText, #0000 90%),
					color-mix(in oklch, canvasText, #0000 95%)
				)
				inset,
			0px 4px 16px rgba(17, 17, 26, 0.05),
			0px 8px 24px rgba(17, 17, 26, 0.05),
			0px 16px 56px rgba(17, 17, 26, 0.05),
			0px 4px 16px rgba(17, 17, 26, 0.05) inset,
			0px 8px 24px rgba(17, 17, 26, 0.05) inset,
			0px 16px 56px rgba(17, 17, 26, 0.05) inset;
	}

	/* Safari cannot resolve SVG url() references inside backdrop-filter, so it needs a
	   plain-blur fallback. -webkit-named-image is a WebKit-only feature query (Chromium
	   and Firefox return false), so this never overrides Chromium's working SVG filter.
	   Ship the -webkit- prefixed backdrop-filter too for Safari and iOS 17 and older. */
	@supports (background: -webkit-named-image(i)) {
		.liquid-glass-effect {
			-webkit-backdrop-filter: blur(var(--lg-fallback-blur)) saturate(var(--lg-fallback-saturation)) !important;
			backdrop-filter: blur(var(--lg-fallback-blur)) saturate(var(--lg-fallback-saturation)) !important;
		}
	}

	.liquid-glass-slot {
		width: 100%;
		height: 100%;
		overflow: hidden;
		border-radius: inherit;
	}

	.liquid-glass-filter {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
