<script lang="ts">
	import LandingHeader from "$lib/components/landing/LandingHeader.svelte";
	import HeroSection from "$lib/components/landing/HeroSection.svelte";
	import FeatureChips from "$lib/components/landing/FeatureChips.svelte";
	import ComponentsShowcase from "$lib/components/landing/ComponentsShowcase.svelte";
	import IconStrip from "$lib/components/landing/IconStrip.svelte";
	import InstallSection from "$lib/components/landing/InstallSection.svelte";
	import ExamplesSection from "$lib/components/landing/ExamplesSection.svelte";
	import ValuesStrip from "$lib/components/landing/ValuesStrip.svelte";
	import FooterCta from "$lib/components/landing/FooterCta.svelte";
</script>

<svelte:head>
	<title>FancyUI — Animated components for Svelte 5</title>
	<meta
		name="description"
		content="61 animated, beautiful UI components for Svelte 5. Built with Tailwind CSS v4 and TypeScript."
	/>
</svelte:head>

<div class="min-h-screen bg-[#050508] text-[#f8fafc]">
	<LandingHeader />
	<main>
		<HeroSection />
		<FeatureChips />
		<ComponentsShowcase />
		<IconStrip />
		<InstallSection />
		<ExamplesSection />
		<ValuesStrip />
		<FooterCta />
	</main>
</div>
