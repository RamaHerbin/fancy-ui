<script lang="ts">
	import {
		Sparkles,
		SparklesText,
		FlipWords,
		RainbowButton,
		BorderBeam,
		Meteors,
		Marquee,
		NumberTicker,
		LineShadowText,
		BoxReveal,
		Timeline,
		ImageTrailCursor,
		BentoGrid,
		BentoGridCard,
		TextGenerateEffect,
	} from "$lib/fancy-ui";
	import type { TimelineItem } from "$lib/fancy-ui";
	import SynthwaveGrid from "$lib/components/SynthwaveGrid.svelte";
	import { Wand2, MousePointer2, GalleryHorizontal } from "@lucide/svelte";

	const GITHUB_URL = "https://github.com/ramaherbin/fancy-ui";
	const DEMO_URL = "/demo";

	const taglineWords = ["animated", "beautiful", "interactive", "composable", "performant"];

	const roadmapItems: TimelineItem[] = [
		{ id: "now", label: "Now" },
		{ id: "v02", label: "v0.2" },
		{ id: "v03", label: "v0.3" },
		{ id: "v10", label: "v1.0" },
	];

	const roadmapContent: Record<
		string,
		{ status: string; statusColor: string; items: { done?: boolean; text: string }[] }
	> = {
		now: {
			status: "Released",
			statusColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
			items: [
				{ done: true, text: "50+ animated components (Svelte 5 runes)" },
				{ done: true, text: "Tailwind CSS v4 + shadcn-svelte" },
				{ done: true, text: "Full TypeScript support" },
				{ done: true, text: "Live demo at fancy-ui.rama.app" },
				{ done: true, text: "Dark / light theme" },
				{ done: true, text: "MIT license" },
			],
		},
		v02: {
			status: "In progress",
			statusColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
			items: [
				{ done: true, text: "npm package — install via npm install fancy-ui" },
				{ text: "Proper package exports + TypeScript declarations" },
				{ text: "CHANGELOG + semantic versioning" },
				{ text: "CONTRIBUTING guide" },
				{ text: "10+ new components" },
			],
		},
		v03: {
			status: "Planned",
			statusColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
			items: [
				{ text: "Dedicated documentation site (component API reference)" },
				{ text: "Accessibility audit (ARIA, keyboard navigation)" },
				{ text: "Playground — edit component props in browser" },
				{ text: "GitHub Actions CI (type-check, tests, visual diff)" },
				{ text: "20+ new components" },
			],
		},
		v10: {
			status: "Vision",
			statusColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
			items: [
				{ text: "Stable public API" },
				{ text: "Full Storybook / Chromatic visual testing" },
				{ text: "Custom theming system (design tokens)" },
				{ text: "100+ components" },
				{ text: "Figma component library" },
			],
		},
	};

	const techBadges = [
		"Svelte 5",
		"Tailwind v4",
		"TypeScript",
		"SvelteKit",
		"MIT",
		"shadcn-svelte",
		"Animations",
		"GSAP",
	];
</script>

<svelte:head>
	<title>FancyUI — Animated components for Svelte 5</title>
	<meta
		name="description"
		content="50+ animated, beautiful UI components for Svelte 5. Built with Tailwind CSS v4 and TypeScript."
	/>
</svelte:head>

<!-- ─── HERO ─────────────────────────────────────────────────────────────── -->
<section
	class="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
>
	<!-- Particle background -->
	<div class="pointer-events-none absolute inset-0">
		<Sparkles
			background="transparent"
			particleColor="#ffffff"
			particleDensity={80}
			minSize={0.6}
			maxSize={1.4}
			speed={1}
		/>
	</div>

	<!-- Content -->
	<div class="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
		<div
			class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60"
		>
			<span class="size-1.5 rounded-full bg-emerald-400"></span>
			Open source · MIT License
		</div>

		<h1 class="text-7xl font-bold tracking-tight text-white sm:text-9xl">
			<SparklesText
				text="FancyUI"
				sparklesCount={12}
				colors={{ first: "#9E7AFF", second: "#FE8BBB" }}
				class="text-7xl font-bold tracking-tight text-white sm:text-9xl"
			/>
		</h1>

		<p class="max-w-xl text-xl text-white/60">
			50+ <FlipWords words={taglineWords} duration={2500} class="font-semibold text-white" /> UI components
			for Svelte 5
		</p>

		<p class="max-w-md text-sm text-white/40">
			Built with Tailwind CSS v4 · TypeScript · shadcn-svelte
		</p>

		<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
			<RainbowButton href={DEMO_URL}>Browse components</RainbowButton>
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
					/>
				</svg>
				GitHub
			</a>
		</div>
	</div>

	<!-- Scroll indicator -->
	<div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/30">
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M12 5v14M5 12l7 7 7-7" />
		</svg>
	</div>
</section>

<!-- ─── STATS ──────────────────────────────────────────────────────────────── -->
<section class="border-border bg-background border-y">
	<div class="divide-border mx-auto grid max-w-3xl grid-cols-3 divide-x">
		{#each [{ value: 50, suffix: "+", label: "Components" }, { value: 5, suffix: "", label: "Svelte 5 runes" }, { value: 100, suffix: "%", label: "TypeScript" }] as stat}
			<div class="flex flex-col items-center gap-1 py-10">
				<div class="text-foreground text-4xl font-bold tabular-nums sm:text-5xl">
					<NumberTicker value={stat.value} duration={1500} />{stat.suffix}
				</div>
				<p class="text-muted-foreground text-sm">{stat.label}</p>
			</div>
		{/each}
	</div>
</section>

<!-- ─── COMPONENT SHOWCASE ────────────────────────────────────────────────── -->
<section class="mx-auto max-w-6xl px-4 py-20">
	<TextGenerateEffect
		words="Everything you need"
		class="text-foreground mb-2 text-center text-3xl font-bold sm:text-4xl"
	/>
	<TextGenerateEffect
		words="Live interactive previews — no screenshots"
		delay={0.4}
		class="text-muted-foreground mb-12 text-center"
	/>

	<BentoGrid>
		<!-- Sparkles -->
		<BentoGridCard
			name="Particle Backgrounds"
			description="Atmospheric particle effects for hero sections and dark layouts."
			href="/demo/sparkles"
			cta="See demo"
			class="col-span-3 md:col-span-1"
		>
			{#snippet icon()}
				<Wand2 class="size-6" />
			{/snippet}
			{#snippet background()}
				<div class="absolute inset-0 bg-black">
					<Sparkles background="transparent" particleColor="#ffffff" particleDensity={40} />
				</div>
			{/snippet}
		</BentoGridCard>

		<!-- ImageTrailCursor -->
		<BentoGridCard
			name="Cursor Magic"
			description="Image trails that follow your cursor with 8 animation variants."
			href="/demo/image-trail-cursor"
			cta="See demo"
			class="col-span-3 md:col-span-2"
		>
			{#snippet icon()}
				<MousePointer2 class="size-6" />
			{/snippet}
			{#snippet background()}
				<div class="absolute inset-0 bg-black">
					<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
						<p class="text-xs text-white/20">Hover here</p>
					</div>
					<ImageTrailCursor
						images={[
							"https://picsum.photos/seed/fancy1/400/440",
							"https://picsum.photos/seed/fancy2/400/440",
							"https://picsum.photos/seed/fancy3/400/440",
							"https://picsum.photos/seed/fancy4/400/440",
							"https://picsum.photos/seed/fancy5/400/440",
							"https://picsum.photos/seed/fancy6/400/440",
						]}
						variant="type1"
					/>
				</div>
			{/snippet}
		</BentoGridCard>

		<!-- Marquee -->
		<BentoGridCard
			name="Infinite Scroll"
			description="Smooth marquee for any content — text, images, badges, cards."
			href="/demo/marquee"
			cta="See demo"
			class="col-span-3"
		>
			{#snippet icon()}
				<GalleryHorizontal class="size-6" />
			{/snippet}
			{#snippet background()}
				<Marquee pauseOnHover repeat={4} class="absolute top-6 [--duration:25s]">
					{#each techBadges as badge}
						<span
							class="mx-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60"
						>
							{badge}
						</span>
					{/each}
				</Marquee>
			{/snippet}
		</BentoGridCard>
	</BentoGrid>

	<div class="mt-8 text-center">
		<a
			href={DEMO_URL}
			class="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
		>
			See all 50+ components →
		</a>
	</div>
</section>

<!-- ─── QUICK START ───────────────────────────────────────────────────────── -->
<section class="bg-muted/40 px-4 py-20">
	<div class="mx-auto max-w-2xl">
		<BoxReveal color="var(--primary)" duration={0.4}>
			<h2 class="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">Quick start</h2>
		</BoxReveal>

		<div class="border-border relative overflow-hidden rounded-xl border bg-[#0d1117]">
			<BorderBeam duration={12} size={120} colorFrom="#9E7AFF" colorTo="#FE8BBB" borderWidth={1} />
			<div class="p-6 font-mono text-sm">
				<div class="mb-1 text-white/40"># 1. Install</div>
				<div class="mb-4 text-emerald-400">npm install fancy-ui</div>
				<div class="mb-1 text-white/40"># 2. Import any component</div>
				<div class="mb-1">
					<span class="text-purple-400">import</span>
					<span class="text-white"> &#123; BorderBeam, Sparkles, Marquee &#125; </span>
					<span class="text-purple-400">from</span>
					<span class="text-amber-300"> 'fancy-ui'</span>
				</div>
				<div class="mb-4 text-xs text-white/30">&nbsp;</div>
				<div class="mb-1 text-white/40"># 3. Use it</div>
				<div>
					<span class="text-blue-400">&lt;BorderBeam</span>
					<span class="text-amber-300"> colorFrom</span>
					<span class="text-white">=</span>
					<span class="text-green-400">"#9E7AFF"</span>
					<span class="text-amber-300"> colorTo</span>
					<span class="text-white">=</span>
					<span class="text-green-400">"#FE8BBB"</span>
					<span class="text-blue-400"> /&gt;</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ─── ROADMAP ───────────────────────────────────────────────────────────── -->
<section class="bg-background px-4">
	<Timeline
		items={roadmapItems}
		title="What's next"
		description="FancyUI is actively developed. Here's where we're headed."
	>
		{#snippet content(item)}
			{@const step = roadmapContent[item.id]}
			{#if step}
				<div class="mb-4 flex items-center gap-2">
					<h3 class="text-foreground text-lg font-bold md:hidden">{item.label}</h3>
					<span class="rounded-full border px-2.5 py-0.5 text-xs font-medium {step.statusColor}">
						{step.status}
					</span>
				</div>
				<ul class="space-y-3">
					{#each step.items as entry}
						<li class="flex items-start gap-2.5 text-sm">
							{#if entry.done}
								<span class="mt-0.5 shrink-0 text-emerald-500">
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										aria-hidden="true"
									>
										<path d="M20 6 9 17l-5-5" />
									</svg>
								</span>
								<span class="text-foreground">{entry.text}</span>
							{:else}
								<span class="text-muted-foreground/40 mt-0.5 shrink-0">
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="9" />
									</svg>
								</span>
								<span class="text-muted-foreground">{entry.text}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{/snippet}
	</Timeline>
</section>

<!-- ─── FINAL CTA ─────────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-black px-4 py-24 text-center">
	<SynthwaveGrid speed={0.7} verticalLines={16} horizontalLines={14} />
	<div class="relative z-10 flex flex-col items-center gap-6">
		<h2 class="text-3xl font-bold text-white sm:text-5xl">Start building today</h2>
		<p class="max-w-sm text-white/50">Free, open source, and ready for Svelte 5.</p>
		<div class="flex flex-wrap justify-center gap-3">
			<RainbowButton href={DEMO_URL}>Browse components</RainbowButton>
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
			>
				Star on GitHub ⭐
			</a>
		</div>
	</div>
</section>
