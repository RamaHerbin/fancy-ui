<script lang="ts">
	import { onMount } from "svelte";
	import { FluidCursor } from "$lib/fancy-ui";

	// The WebGPU/WebGL fluid simulation is the heaviest thing on the page — hold
	// it back until the browser is idle so it never competes with first paint.
	let showFluidCursor = $state(false);

	onMount(() => {
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

<!-- pt clears the sticky header (h-[72px]); without it the badge is clipped on load. -->
<section
	class="relative flex min-h-[85vh] flex-col justify-center overflow-hidden px-4 pt-28 pb-[72px] sm:px-8 lg:px-14"
>
	{#if showFluidCursor}
		<FluidCursor simResolution={128} hdr hdrBoost={2} splatOnMount />
	{/if}
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(91,140,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(91,140,255,.04)_1px,transparent_1px)] [background-size:64px_64px]"
	></div>
	<div
		aria-hidden="true"
		class="pointer-events-none absolute -top-[10%] -right-[6%] h-[80%] w-[55%] bg-[radial-gradient(ellipse_50%_40%_at_60%_40%,rgba(124,58,237,.35),rgba(59,130,246,.15)_55%,transparent_75%)] blur-[40px]"
	></div>

	<div class="relative flex flex-col items-center gap-[22px] text-center">
		<div class="flex items-center gap-3">
			<span
				aria-hidden="true"
				class="h-px w-[120px] bg-[linear-gradient(90deg,transparent,rgba(139,123,255,.6))]"
			></span>
			<span
				class="inline-flex items-center gap-2 rounded-full border border-[rgba(139,123,255,.3)] bg-[rgba(22,22,34,.8)] px-4 py-1.5 text-[12.5px] text-[#c3cadf]"
			>
				<span aria-hidden="true" class="text-[#8b7bff]">⚡</span> Svelte-first UI library
			</span>
			<span
				aria-hidden="true"
				class="h-px w-[120px] bg-[linear-gradient(90deg,rgba(139,123,255,.6),transparent)]"
			></span>
		</div>

		<h1
			class="max-w-3xl text-5xl leading-[1.12] font-extrabold tracking-[-0.025em] text-balance sm:text-6xl lg:text-[64px]"
		>
			<span class="bg-[linear-gradient(180deg,#ffffff,#b8bfd4)] bg-clip-text text-transparent"
				>Build beau</span
			><span class="relative inline-block"
				><span class="bg-[linear-gradient(180deg,#ffffff,#b8bfd4)] bg-clip-text text-transparent"
					>tiful</span
				><span
					aria-hidden="true"
					class="glow-echo pointer-events-none absolute inset-0 text-[#e6ecff] opacity-75 blur-[10px]"
				></span><span
					aria-hidden="true"
					class="glow-echo pointer-events-none absolute inset-0 text-white opacity-50 blur-[3px]"
				></span></span
			><br />
			<span class="bg-[linear-gradient(180deg,#ffffff,#b8bfd4)] bg-clip-text text-transparent"
				>interfaces</span
			>{" "}<span class="bg-[linear-gradient(100deg,#a78bfa,#5b8cff)] bg-clip-text text-transparent"
				>effortlessly.</span
			>
		</h1>

		<p class="max-w-[520px] text-[16.5px] leading-[1.65] text-[#9aa3b2]">
			FancyUI is a modern, animated and accessible component library for Svelte 5. Designed to help
			you ship faster with style.
		</p>

		<div class="mt-2.5 flex flex-col gap-3.5 sm:flex-row">
			<a
				href="/docs"
				class="inline-flex items-center gap-2.5 rounded-xl bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] px-[26px] py-[13px] text-sm font-semibold text-white shadow-[0_8px_30px_rgba(91,140,255,0.4)] transition-opacity hover:opacity-90"
			>
				Get Started <span aria-hidden="true">→</span>
			</a>
			<a
				href="/docs/components"
				class="inline-flex items-center rounded-xl border border-white/12 bg-[rgba(19,19,26,.7)] px-[26px] py-[13px] text-sm font-medium text-[#e6e9ef] transition-colors hover:border-white/25"
			>
				Browse Components
			</a>
		</div>
	</div>
</section>

<style>
	/* The two blur layers stacked over "tiful" are generated content, not text
	   nodes, so the <h1> reads as "Build beautiful interfaces effortlessly."
	   instead of repeating the syllable three times for crawlers. */
	.glow-echo::before {
		content: "tiful";
	}
</style>
