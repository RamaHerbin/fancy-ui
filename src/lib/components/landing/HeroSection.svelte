<!--
	Hero row of the 13a frame: copy column on the left, and on the right the
	page's first live specimen — panel 01, the fluid cursor — complete with the
	axis rulers that make it read as an instrument, not a screenshot.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { FluidCursor } from "$lib/fancy-ui";
	import PanelChrome from "./PanelChrome.svelte";
	import { GITHUB_URL, PACKAGE_NAME } from "$lib/site.js";

	// The WebGPU/WebGL fluid simulation is the heaviest thing on the page — hold it
	// back until the browser is idle so it never competes with first paint, and skip
	// it entirely for visitors who asked for less motion.
	let showFluidCursor = $state(false);

	onMount(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		if ("requestIdleCallback" in window) {
			requestIdleCallback(
				() => {
					showFluidCursor = true;
				},
				{ timeout: 200 }
			);
		} else {
			setTimeout(() => {
				showFluidCursor = true;
			}, 100);
		}
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
	/>
</svelte:head>

<section class="lp-line grid border-b lg:h-[438px] lg:grid-cols-[38fr_62fr]">
	<!-- Copy column -->
	<div class="flex flex-col overflow-hidden px-6 pt-9 pb-10 sm:px-10 lg:pr-10 lg:pb-0 lg:pl-[46px]">
		<span
			class="lp-mono self-start text-[11.5px] tracking-[0.18em]"
			style="color:var(--lp-grey-2)"
		>
			<span class="border-b-2 pb-[7px]" style="border-color:var(--lp-accent)">FANCY UI</span> / v1.2
		</span>
		<h1
			class="mt-[22px] text-[clamp(46px,5vw,76px)] leading-[0.94] font-[750] tracking-[-0.035em] text-balance"
		>
			Interfaces<br />that feel<br /><span class="serif-accent">alive.</span>
		</h1>
		<p class="mt-4 max-w-[310px] text-[15.5px] leading-[1.5]" style="color:#a09f9a">
			Open-source Svelte components for expressive, motion-first interfaces.
		</p>
		<div class="mt-[22px] flex flex-wrap gap-3.5">
			<a
				href="/docs/components"
				class="lp-btn-accent inline-flex items-center gap-3 rounded-[2px] px-5 py-[13px] text-[14px] font-medium"
			>
				Explore components <span aria-hidden="true">→</span>
			</a>
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="lp-btn-outline inline-flex items-center gap-2.5 rounded-[2px] px-[22px] py-[13px] text-[14px] font-medium"
			>
				GitHub <span class="text-[12px]" style="color:var(--lp-grey-3)" aria-hidden="true">↗</span>
			</a>
		</div>
	</div>

	<!-- Panel 01 — Fluid Cursor -->
	<div class="lp-line hidden border-l sm:block">
		<PanelChrome
			index="01"
			title="FLUID CURSOR"
			slug="fluid-cursor"
			hint="MOVE TO EXPLORE"
			coords="x"
			copyText={`import { FluidCursor } from "${PACKAGE_NAME}";`}
		>
			<div class="relative flex min-h-[300px] flex-1 lg:min-h-0">
				<!-- Vertical axis ruler -->
				<div
					class="lp-line hidden w-[25px] flex-none flex-col items-center justify-between border-r py-3 lg:flex"
				>
					<span class="lp-ruler">Y — 000</span>
					<span class="lp-ruler">Y — 500</span>
				</div>

				<div class="lp-stage relative min-w-0 flex-1 overflow-hidden" style="background:var(--lp-panel)">
					{#if showFluidCursor}
						<FluidCursor contained simResolution={128} hdr hdrBoost={2} splatOnMount />
					{/if}
					<div class="lp-overlay gap-[26px]">
						<!-- Crosshair reticle -->
						<span class="relative block h-[58px] w-[58px]" aria-hidden="true">
							<span
								class="absolute top-1/2 left-1/2 h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
								style="border-color:var(--lp-accent)"
							></span>
							<span class="lp-tick top-0 left-1/2 h-[9px] w-[1.5px] -translate-x-1/2"></span>
							<span class="lp-tick bottom-0 left-1/2 h-[9px] w-[1.5px] -translate-x-1/2"></span>
							<span class="lp-tick top-1/2 left-0 h-[1.5px] w-[9px] -translate-y-1/2"></span>
							<span class="lp-tick top-1/2 right-0 h-[1.5px] w-[9px] -translate-y-1/2"></span>
						</span>
						<span class="flex flex-col items-center gap-2.5">
							<span class="lp-mono text-[15px] tracking-[0.14em]">MOVE YOUR CURSOR HERE</span>
							<span class="lp-mono text-[11px] tracking-[0.2em]" style="color:var(--lp-grey-4)"
								>TO ACTIVATE FLUID</span
							>
						</span>
					</div>
				</div>
			</div>
		</PanelChrome>
	</div>
</section>

<style>
	.serif-accent {
		font-family: var(--lp-font-serif);
		font-style: italic;
		/* Instrument Serif ships a single 400 weight; anything heavier would be
		   synthesized. The serif word runs ~10% larger than the sans lines to
		   match their optical size. */
		font-weight: 400;
		font-size: 1.1em;
		letter-spacing: -0.01em;
	}

	.lp-ruler {
		font-family: var(--lp-font-mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		color: var(--lp-grey-5);
		writing-mode: vertical-rl;
		transform: rotate(180deg);
	}

	.lp-tick {
		position: absolute;
		background: var(--lp-accent);
	}
</style>
