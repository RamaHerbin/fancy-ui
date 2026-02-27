<script lang="ts">
	import { onMount } from "svelte";
	import { FluidCursor } from "$lib/fancy-ui/fluid-cursor/index.js";
	import { InteractiveGridPattern } from "$lib/fancy-ui/interactive-grid-pattern/index.js";
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal/index.js";
	import { RainbowButton } from "$lib/fancy-ui/rainbow-button/index.js";

	let heroSectionRef: HTMLDivElement | undefined = $state();
	let showInteractiveElements = $state(false);

	function scrollToAbout() {
		const el = document.getElementById("trusted");
		el?.scrollIntoView({ behavior: "smooth" });
	}

	onMount(() => {
		if ("requestIdleCallback" in window) {
			requestIdleCallback(
				() => {
					showInteractiveElements = true;
				},
				{ timeout: 200 }
			);
		} else {
			setTimeout(() => {
				showInteractiveElements = true;
			}, 100);
		}
	});
</script>

<div
	bind:this={heroSectionRef}
	class="relative flex min-h-[90vh] items-center justify-center overflow-hidden"
>
	<!-- Fluid Cursor -->
	<FluidCursor simResolution={128} />

	<!-- Interactive Grid Pattern Background -->
	{#if showInteractiveElements}
		<InteractiveGridPattern
			width={80}
			height={80}
			class="inset-0 h-full [mask-image:radial-gradient(500px_circle_at_center,white,transparent)] opacity-30"
		/>
	{/if}

	<!-- Hero Content -->
	<div class="relative z-10 mx-auto mt-32 max-w-4xl px-6 text-center lg:px-8">
		<h1 class="text-foreground text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
			Rama Herbin
		</h1>

		<BlurReveal delay={0.2} duration={0.75} class="space-y-8">
			<h2 class="text-xl font-medium text-neutral-400 sm:text-2xl lg:text-3xl">
				Front-End & UI Engineer
			</h2>

			<p class="text-muted-foreground text-lg sm:text-xl">
				working at
				<a
					href="https://www.ansys.com"
					target="_blank"
					rel="noopener noreferrer"
					class="text-foreground font-semibold underline-offset-4 hover:underline"
					aria-label="Open Ansys website in a new tab"
				>
					Ansys&reg;
				</a>
				<span class="text-foreground/80"> &mdash; part of </span>
				<span class="text-foreground/90 align-baseline text-[0.9em]">Synopsys Inc.</span>
				<span class="text-foreground/80 text-tiny block italic"
					>A simulation-driven company&trade;</span
				>
			</p>

			<div class="pt-8">
				<RainbowButton
					class="px-8 py-4 text-lg font-medium transition-all hover:scale-105"
					onclick={scrollToAbout}
					aria-label="Scroll to About section"
				>
					Explore
				</RainbowButton>
			</div>
		</BlurReveal>
	</div>
</div>
