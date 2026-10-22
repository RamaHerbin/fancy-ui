<script setup lang="ts">
const soundOn = useSoundEnabled();

const beams = [
	{ title: "Build", detail: "Compiled in 1.8 s", from: "#f5d0a9", to: "#e879f9", delay: 0 },
	{ title: "Preview", detail: "Ready on a branch URL", from: "#7dd3fc", to: "#a78bfa", delay: -2 },
	{ title: "Release", detail: "Waiting for review", from: "#86efac", to: "#38bdf8", delay: -4 },
];
</script>

<template>
	<div class="space-y-20 pt-16">
		<section class="space-y-6">
			<p class="text-muted-foreground text-xs font-medium tracking-widest uppercase">Playground</p>
			<h1 class="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
				Animated Vue components, registered by one Nuxt module.
			</h1>
			<p class="text-muted-foreground max-w-xl">
				Everything on this page is server-rendered, then hydrated. No component is imported by hand:
				the module registers each one as <code class="text-foreground">&lt;Fancy*&gt;</code>
				and ships the stylesheet.
			</p>
			<div class="flex flex-wrap items-center gap-3">
				<FancyShimmerButton sound>Shimmer button</FancyShimmerButton>
				<FancyButton variant="outline">Plain button</FancyButton>
			</div>
		</section>

		<section class="space-y-4">
			<header class="space-y-1">
				<h2 class="text-lg font-semibold">Browser-only effect</h2>
				<p class="text-muted-foreground text-sm">
					A WebGL fluid simulation. The server sends an empty canvas; the engine starts after
					hydration and stays inside its container.
				</p>
			</header>
			<div
				class="border-border relative h-72 overflow-hidden rounded-2xl border bg-black"
				data-testid="fluid"
			>
				<FancyFluidCursor auto-splat splat-on-mount :color-intensity="0.35" />
				<p
					class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/70 select-none"
				>
					Move your cursor here
				</p>
			</div>
		</section>

		<section class="space-y-4">
			<header class="space-y-1">
				<h2 class="text-lg font-semibold">Several instances</h2>
				<p class="text-muted-foreground text-sm">
					Three independent border beams, each with its own colours and phase.
				</p>
			</header>
			<div class="grid gap-4 sm:grid-cols-3">
				<div
					v-for="beam in beams"
					:key="beam.title"
					class="border-border bg-card relative overflow-hidden rounded-2xl border p-5 [--border-beam-radius:16px]"
				>
					<p class="text-sm font-medium">{{ beam.title }}</p>
					<p class="text-muted-foreground text-xs">{{ beam.detail }}</p>
					<FancyBorderBeam :color-from="beam.from" :color-to="beam.to" :delay="beam.delay" />
				</div>
			</div>
		</section>

		<section class="space-y-4">
			<header class="space-y-1">
				<h2 class="text-lg font-semibold">Sound</h2>
				<p class="text-muted-foreground text-sm">
					Off until the visitor opts in. The toggle and
					<code class="text-foreground">useSoundEnabled()</code> share one store, so the header
					switch and this one stay in sync. With sound on, hover the shimmer button above.
				</p>
			</header>
			<div class="flex items-center gap-4">
				<FancySoundToggle show-label />
				<span class="text-muted-foreground text-sm">
					useSoundEnabled() →
					<span class="text-foreground font-mono">{{ soundOn }}</span>
				</span>
			</div>
		</section>

		<section class="space-y-4">
			<header class="space-y-1">
				<h2 class="text-lg font-semibold">Lazy, hydrated on visible</h2>
				<p class="text-muted-foreground text-sm">
					<code class="text-foreground">&lt;LazyFancyFlickeringGrid hydrate-on-visible&gt;</code>
					loads its code and starts drawing only once it scrolls into view.
				</p>
			</header>
			<div class="h-[30vh]" aria-hidden="true"></div>
			<div
				class="border-border relative h-56 overflow-hidden rounded-2xl border"
				data-testid="lazy-grid"
			>
				<LazyFancyFlickeringGrid hydrate-on-visible color="#a78bfa" :max-opacity="0.4" />
			</div>
		</section>
	</div>
</template>
