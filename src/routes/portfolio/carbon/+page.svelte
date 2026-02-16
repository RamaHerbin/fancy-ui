<script lang="ts">
	import { BlurReveal } from '$lib/fancy-ui/blur-reveal/index.js';
</script>

<svelte:head>
	<title>Carbon Footprint - Rama Herbin</title>
	<meta
		name="description"
		content="Learn about the environmental optimization strategies used in this portfolio website."
	/>
</svelte:head>

<div class="min-h-screen bg-black text-white">
	<!-- Navigation back -->
	<nav class="border-b border-white/10 px-6 py-4">
		<a
			href="/portfolio"
			class="inline-flex items-center gap-2 text-white/70 hover:text-white/90 transition"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 19l-7-7 7-7"
				/>
			</svg>
			Back to portfolio
		</a>
	</nav>

	<section class="mx-auto max-w-2xl px-6 py-16 text-white/80">
		<BlurReveal delay={0.2} duration={0.75}>
			<h1 class="text-2xl font-semibold tracking-tight text-white">Carbon & Footprint</h1>
			<p class="mt-4 text-sm leading-7 text-white/60">
				This site aims to minimize environmental impact through efficient code, optimized images,
				and reduced motion rendering.
			</p>
		</BlurReveal>

		<BlurReveal delay={0.4} duration={0.75}>
			<div class="mt-8 space-y-6">
				<h2 class="text-lg font-medium text-white/90">Optimization Strategies</h2>
				<ul class="list-disc space-y-2 pl-6 text-sm text-white/60">
					<li>Lazy loading and code splitting for animations and interactive elements.</li>
					<li>
						Optimized vector graphics and compressed assets for minimal bandwidth usage.
					</li>
					<li>Server-side rendering and intelligent caching strategies.</li>
					<li>Efficient CSS with Tailwind's purge system to reduce bundle size.</li>
					<li>Modern image formats (WebP, AVIF) with fallbacks for compatibility.</li>
				</ul>
			</div>
		</BlurReveal>

		<BlurReveal delay={0.6} duration={0.75}>
			<div class="mt-8 space-y-4">
				<h2 class="text-lg font-medium text-white/90">Performance Metrics</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-lg border border-white/10 bg-white/5 p-4">
						<div class="text-sm text-white/50">Bundle Size</div>
						<div class="text-lg font-medium text-white">~45KB gzipped</div>
					</div>
					<div class="rounded-lg border border-white/10 bg-white/5 p-4">
						<div class="text-sm text-white/50">First Paint</div>
						<div class="text-lg font-medium text-white">&lt; 1.2s</div>
					</div>
					<div class="rounded-lg border border-white/10 bg-white/5 p-4">
						<div class="text-sm text-white/50">Lighthouse Score</div>
						<div class="text-lg font-medium text-white">95+</div>
					</div>
					<div class="rounded-lg border border-white/10 bg-white/5 p-4">
						<div class="text-sm text-white/50">CO&#x2082; per visit</div>
						<div class="text-lg font-medium text-white">~0.2g</div>
					</div>
				</div>
			</div>
		</BlurReveal>
	</section>
</div>
