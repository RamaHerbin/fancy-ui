<!--
	"SIGNATURE INTERACTIONS" — the middle band of the 13a frame. Three live
	specimens in bordered panels: the image-trail cursor, the liquid-glass
	pill over a high-contrast test backdrop, and the rainbow button. Every
	demo is the real library component, not a still.
-->
<script lang="ts">
	import { ImageTrailCursor, LiquidGlass, RainbowButton } from "$lib/fancy-ui";
	import PanelChrome from "./PanelChrome.svelte";
	import { PACKAGE_NAME } from "$lib/site.js";

	/* Component OG previews double as trail imagery — on-brand and already
	   shipped with the site, so the panel costs no new assets. */
	const TRAIL_IMAGES = [
		"/og/border-beam.jpg",
		"/og/card-3d.jpg",
		"/og/bg-stars.jpg",
		"/og/apple-card-carousel.jpg",
		"/og/animated-testimonials.jpg",
		"/og/bento-grid.jpg",
	];

	/* The staircase of outlined rectangles in the overlay — echoes the path
	   the images will take. left/top/width/height in px. */
	const STAIR_RECTS = [
		{ left: 0, top: 62, w: 36, h: 26 },
		{ left: 44, top: 42, w: 38, h: 27 },
		{ left: 86, top: 20, w: 40, h: 28 },
		{ left: 122, top: 0, w: 42, h: 29 },
	];
</script>

<!-- Divider -->
<div class="lp-line flex h-9 flex-none items-center gap-6 border-b pl-6 sm:pl-[46px]">
	<span class="lp-mono text-[11px] tracking-[0.16em]" style="color:var(--lp-grey-2)"
		>SIGNATURE INTERACTIONS — 04</span
	>
	<span class="mr-6 h-px flex-1" style="background:rgba(242,241,236,.1)"></span>
</div>

<div class="lp-line grid border-b lg:h-[322px] lg:grid-cols-[38fr_29fr_33fr]">
	<!-- 02 — Image Trail -->
	<div class="lp-line border-b lg:border-r lg:border-b-0">
		<PanelChrome
			index="02"
			title="IMAGE TRAIL CURSOR"
			slug="image-trail-cursor"
			copyText={`import { ImageTrailCursor } from "${PACKAGE_NAME}";`}
		>
			<div
				class="lp-stage relative min-h-[260px] flex-1 overflow-hidden lg:min-h-0"
				style="background:var(--lp-panel)"
			>
				<ImageTrailCursor images={TRAIL_IMAGES} class="absolute inset-0" />
				<div class="lp-overlay gap-[22px]">
					<span class="relative block h-[90px] w-[164px]" aria-hidden="true">
						{#each STAIR_RECTS as rect (rect.left)}
							<span
								class="absolute rounded-[2px] border-[1.5px]"
								style="left:{rect.left}px;top:{rect.top}px;width:{rect.w}px;height:{rect.h}px;border-color:var(--lp-accent)"
							></span>
						{/each}
					</span>
					<span class="flex flex-col items-center gap-[9px]">
						<span class="lp-mono text-[13px] tracking-[0.14em]">MOVE TO REVEAL IMAGES</span>
						<span class="lp-mono text-[10.5px] tracking-[0.18em]" style="color:var(--lp-grey-4)"
							>IMAGES FOLLOW YOUR PATH</span
						>
					</span>
				</div>
			</div>
		</PanelChrome>
	</div>

	<!-- 03 — LiquidGlass -->
	<div class="lp-line border-b lg:border-r lg:border-b-0">
		<PanelChrome
			index="03"
			title="LIQUIDGLASS"
			slug="liquid-glass"
			compact
			copyText={`import { LiquidGlass } from "${PACKAGE_NAME}";`}
		>
			<!-- High-contrast test backdrop from the design: fine grid, ivory
			     disc, barcode stripes — everything the glass can distort. -->
			<div class="relative min-h-[260px] flex-1 overflow-hidden bg-[#0a0a0a] lg:min-h-0">
				<div
					class="absolute inset-0 opacity-25"
					style="background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.55) 0 1px,transparent 1px 26px),repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 1px,transparent 1px 26px)"
					aria-hidden="true"
				></div>
				<div
					class="absolute -top-[60px] -left-[150px] h-[380px] w-[320px] rounded-full bg-[#d6d5d0]"
					aria-hidden="true"
				></div>
				<div
					class="absolute top-0 right-0 bottom-0 w-[86px]"
					style="background:repeating-linear-gradient(90deg,#e8e7e2 0 12px,#0c0c0c 12px 26px)"
					aria-hidden="true"
				></div>

				<div class="absolute top-1/2 left-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2">
					<!-- Softer than the component defaults: at pill size the default
					     displacement (scale −180) and dispersion smear the backdrop
					     into rainbow ghosting; the design wants readable glass. -->
					<LiquidGlass
						radius={999}
						scale={-60}
						gOffset={4}
						bOffset={8}
						blur={8}
						frost={0.08}
						containerClass="w-full"
					>
						<div class="flex h-[88px] w-full items-center gap-3.5 px-[30px] text-white">
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								aria-hidden="true"
								><circle cx="12" cy="12" r="4"></circle><path
									d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
								></path></svg
							>
							<span class="text-[18px] font-medium">Contrast</span>
							<span class="flex-1"></span>
							<span class="text-[18px]">72%</span>
						</div>
					</LiquidGlass>
				</div>
			</div>
		</PanelChrome>
	</div>

	<!-- 04 — Rainbow Button -->
	<div>
		<PanelChrome
			index="04"
			title="RAINBOW BUTTON"
			slug="rainbow-button"
			compact
			copyText={`import { RainbowButton } from "${PACKAGE_NAME}";`}
		>
			<div
				class="flex min-h-[200px] flex-1 items-center justify-center overflow-hidden lg:min-h-0"
				style="background:var(--lp-panel)"
			>
				<RainbowButton>Get Started</RainbowButton>
			</div>
		</PanelChrome>
	</div>
</div>
