<script lang="ts">
	import { onMount } from "svelte";
	import {
		Sparkles,
		SparklesText,
		FlipWords,
		RainbowButton,
		BorderBeam,
		Marquee,
		NumberTicker,
		LineShadowText,
		BoxReveal,
		Timeline,
		Meteors,
		FlickeringGrid,
		AnimatedTooltip,
		ImageTrailCursor,
		FluidCursor,
		InteractiveGridPattern,
	} from "$lib/fancy-ui";
	import type { TimelineItem, TooltipItem } from "$lib/fancy-ui";
	import SynthwaveGrid from "$lib/components/SynthwaveGrid.svelte";

	let showInteractiveElements = $state(false);

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

	const GITHUB_URL = "https://github.com/ramaherbin/fancy-ui";
	const DEMO_URL = "/demo";
	const DOCS_URL = "/docs";

	const contributors: (TooltipItem & { login: string; contributions: number })[] = [
		{
			id: 1,
			login: "RamaHerbin",
			name: "Rama Herbin",
			designation: "Creator & maintainer",
			image: "https://avatars.githubusercontent.com/u/41597427?v=4",
			contributions: 160,
		},
		{
			id: 2,
			login: "claude",
			name: "Claude",
			designation: "AI contributor",
			image: "https://avatars.githubusercontent.com/u/81847?v=4",
			contributions: 1,
		},
	];

	const taglineWords = ["animated", "beautiful", "interactive", "composable", "performant"];

	const techBadges = [
		"Svelte 5",
		"Tailwind v4",
		"TypeScript",
		"SvelteKit",
		"MIT License",
		"shadcn-svelte",
		"Animations",
		"GSAP",
		"Open Source",
		"Zero Config",
	];

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
			status: "Released",
			statusColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
			items: [
				{ done: true, text: "npm package — install via npm install fancy-ui" },
				{ done: true, text: "Proper package exports + TypeScript declarations" },
				{ done: true, text: "CHANGELOG + semantic versioning" },
				{ done: true, text: "CONTRIBUTING guide" },
				{ done: true, text: "10+ new components" },
			],
		},
		v03: {
			status: "In progress",
			statusColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
			items: [
				{ done: true, text: "Playground — edit component props in browser" },
				{ text: "Dedicated documentation site (component API reference)" },
				{ text: "Accessibility audit (ARIA, keyboard navigation)" },
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
</script>

<svelte:head>
	<title>FancyUI — Animated components for Svelte 5</title>
	<meta
		name="description"
		content="60+ animated, beautiful UI components for Svelte 5. Built with Tailwind CSS v4 and TypeScript."
	/>
</svelte:head>

<!-- ─── HERO (dark, full-screen) ────────────────────────────────────────────── -->
<section
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black"
>
	<!-- Fluid Cursor + Interactive Grid (lazy) -->
	{#if showInteractiveElements}
		<FluidCursor simResolution={128} />
		<InteractiveGridPattern
			width={80}
			height={80}
			class="inset-0 h-full [mask-image:radial-gradient(600px_circle_at_center,white,transparent)] opacity-20"
		/>
	{/if}

	<!-- Content -->
	<div class="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
		<div
			class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60"
		>
			<span class="size-1.5 rounded-full bg-emerald-400"></span>
			Open source · MIT License
		</div>

		<h1>
			<SparklesText
				text="FancyUI"
				sparklesCount={12}
				colors={{ first: "#9E7AFF", second: "#FE8BBB" }}
				class="text-8xl font-bold tracking-tight text-white sm:text-[10rem]"
			/>
		</h1>

		<p class="max-w-xl text-xl text-white/60">
			60+ <FlipWords words={taglineWords} duration={2500} class="font-semibold text-white" /> UI components
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
				class="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
		>
			<path d="M12 5v14M5 12l7 7 7-7" />
		</svg>
	</div>
</section>

<!-- ─── COMPONENT SHOWCASE CARDS (dark bg) ──────────────────────────────────── -->
<section class="bg-black px-4 py-24">
	<div class="mx-auto max-w-7xl">
		<!-- Section label -->
		<div class="mb-4 flex items-center gap-3">
			<span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Components</span>
			<div class="h-px flex-1 bg-white/10"></div>
		</div>

		<h2 class="mb-16 text-5xl font-bold tracking-tight text-white sm:text-7xl">
			Live previews.<br />No screenshots.
		</h2>

		<!-- Horizontal scrollable cards -->
		<div
			class="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
		>
			<!-- Sparkles card -->
			<a
				href="/docs/components/sparkles"
				class="group relative flex h-80 w-72 shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-black sm:w-auto"
			>
				<div class="pointer-events-none absolute inset-0">
					<Sparkles background="transparent" particleColor="#ffffff" particleDensity={50} />
				</div>
				<div
					class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
				></div>
				<div class="relative z-10 p-6">
					<p class="mb-1 text-lg font-semibold text-white">Particle Backgrounds</p>
					<p class="mb-4 text-sm text-white/50">Atmospheric effects for dark layouts</p>
					<span
						class="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/70 transition-colors group-hover:bg-white/20"
					>
						See demo →
					</span>
				</div>
			</a>

			<!-- Meteors card -->
			<a
				href="/docs/components/meteors"
				class="group relative flex h-80 w-72 shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-zinc-900 sm:w-auto"
			>
				<div class="absolute inset-0">
					<Meteors count={18} />
				</div>
				<div
					class="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent"
				></div>
				<div class="relative z-10 p-6">
					<p class="mb-1 text-lg font-semibold text-white">Meteors</p>
					<p class="mb-4 text-sm text-white/50">Animated meteor shower backgrounds</p>
					<span
						class="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/70 transition-colors group-hover:bg-white/20"
					>
						See demo →
					</span>
				</div>
			</a>

			<!-- ImageTrailCursor card -->
			<a
				href="/docs/components/image-trail-cursor"
				class="group relative flex h-80 w-72 shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-black sm:w-auto"
			>
				<div class="absolute inset-0 cursor-crosshair">
					<ImageTrailCursor
						images={[
							"https://picsum.photos/seed/trail1/400/440",
							"https://picsum.photos/seed/trail2/400/440",
							"https://picsum.photos/seed/trail3/400/440",
							"https://picsum.photos/seed/trail4/400/440",
							"https://picsum.photos/seed/trail5/400/440",
							"https://picsum.photos/seed/trail6/400/440",
						]}
						variant="type1"
					/>
				</div>
				<div
					class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
				></div>
				<div class="pointer-events-none relative z-10 p-6">
					<p class="mb-1 text-lg font-semibold text-white">Image Trail Cursor</p>
					<p class="mb-4 text-sm text-white/50">Interactive image trails that follow your cursor</p>
					<span
						class="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/70 transition-colors group-hover:bg-white/20"
					>
						See demo →
					</span>
				</div>
			</a>

			<!-- AnimatedTooltip card -->
			<a
				href="/docs/components/animated-tooltip"
				class="group relative flex h-80 w-72 shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-zinc-900 sm:w-auto"
			>
				<div class="absolute inset-0 flex items-center justify-center">
					<AnimatedTooltip
						items={[
							{
								id: 1,
								name: "Sarah Chen",
								designation: "Frontend Lead",
								image: "https://i.pravatar.cc/150?img=1",
							},
							{
								id: 2,
								name: "Alex Rivera",
								designation: "Designer",
								image: "https://i.pravatar.cc/150?img=3",
							},
							{
								id: 3,
								name: "Jordan Lee",
								designation: "Full Stack Dev",
								image: "https://i.pravatar.cc/150?img=5",
							},
							{
								id: 4,
								name: "Sam Taylor",
								designation: "DevOps",
								image: "https://i.pravatar.cc/150?img=8",
							},
						]}
					/>
				</div>
				<div
					class="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/30 to-transparent"
				></div>
				<div class="relative z-10 p-6">
					<p class="mb-1 text-lg font-semibold text-white">Animated Tooltip</p>
					<p class="mb-4 text-sm text-white/50">Hover-activated tooltips with smooth animations</p>
					<span
						class="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/70 transition-colors group-hover:bg-white/20"
					>
						See demo →
					</span>
				</div>
			</a>
		</div>

		<div class="mt-8">
			<a
				href={DEMO_URL}
				class="text-sm text-zinc-500 underline-offset-4 transition-colors hover:text-white hover:underline"
			>
				See all 60+ components →
			</a>
		</div>
	</div>
</section>

<!-- ─── STATS BENTO (Krea-style) ───────────────────────────────────────────────── -->
<section class="bg-black px-4 py-24">
	<div class="mx-auto max-w-7xl">
		<!-- Editorial heading -->
		<div class="mb-4 flex items-center gap-3">
			<span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase">The numbers</span>
			<div class="h-px flex-1 bg-white/10"></div>
		</div>
		<h2 class="mb-10 text-5xl leading-none font-bold tracking-tight text-white sm:text-7xl">
			60+ components.<br />Zero bloat.
		</h2>

		<!-- Row 1: dark 2col + 2 light stats -->
		<div class="grid grid-cols-3 gap-3">
			<!-- Hero card (col-span-2, row-span-2) — FlickeringGrid bg, large text -->
			<div
				class="relative col-span-3 row-span-2 overflow-hidden rounded-3xl bg-zinc-900 sm:col-span-2"
				style="min-height:280px"
			>
				<div class="pointer-events-none absolute inset-0">
					<FlickeringGrid
						color="#ffffff"
						maxOpacity={0.1}
						flickerChance={0.08}
						squareSize={5}
						gridGap={7}
						class="h-full w-full"
					/>
				</div>
				<div class="relative z-10 flex h-full flex-col justify-end p-10">
					<p
						class="gradient-num-dark mb-1 text-6xl leading-none font-black tracking-tight sm:text-8xl"
					>
						~2kb
					</p>
					<p class="text-lg font-semibold text-zinc-400">Svelte runtime bundle</p>
					<p class="mt-1 text-sm text-zinc-500">22× lighter than React · zero virtual DOM</p>
				</div>
			</div>

			<!-- Stat: 60+ -->
			<div
				class="col-span-3 flex flex-col justify-between rounded-3xl bg-zinc-900 p-8 sm:col-span-1"
			>
				<p class="text-sm font-medium text-zinc-500">Components</p>
				<div>
					<div class="flex items-start leading-none">
						<span class="gradient-num-dark text-7xl font-black tracking-tighter sm:text-8xl">
							<NumberTicker value={60} duration={1500} />
						</span>
						<span class="gradient-num-dark mt-1 text-4xl font-black">+</span>
					</div>
					<p class="mt-3 text-sm text-zinc-500">animated &amp; interactive</p>
				</div>
			</div>

			<!-- Stat: 100% TS -->
			<div
				class="col-span-3 flex flex-col justify-between rounded-3xl bg-zinc-900 p-8 sm:col-span-1"
			>
				<p class="text-sm font-medium text-zinc-500">TypeScript</p>
				<div>
					<div class="flex items-start leading-none">
						<span class="gradient-num-dark text-7xl font-black tracking-tighter sm:text-8xl">
							<NumberTicker value={100} duration={1500} />
						</span>
						<span class="gradient-num-dark mt-1 text-4xl font-black">%</span>
					</div>
					<p class="mt-3 text-sm text-zinc-500">fully typed API</p>
				</div>
			</div>
		</div>

		<!-- Row 2: install snippet 2col + MIT 1col -->
		<div class="mt-3 grid grid-cols-3 gap-3">
			<!-- Dark install card (col-span-2) -->
			<div class="relative col-span-3 overflow-hidden rounded-3xl bg-[#0a0a12] p-10 sm:col-span-2">
				<BorderBeam
					duration={14}
					size={250}
					colorFrom="#9E7AFF"
					colorTo="#FE8BBB"
					borderWidth={1}
				/>
				<p class="mb-6 text-sm font-medium text-white/30">Get started in seconds</p>
				<div class="font-mono">
					<div class="mb-4">
						<span class="text-xs text-white/20">$ </span>
						<span
							class="text-lg font-semibold text-[#29becc]"
							style="text-shadow: 0 0 2px #fff, 0 0 4px #29becc, 0 0 8px #29becc88"
							>npm install fancy-ui-svelte</span
						>
					</div>
					<div class="text-sm">
						<span
							class="text-[#ff7edb]"
							style="text-shadow: 0 0 2px #fff, 0 0 4px #ff00de, 0 0 8px #ff00de88">import</span
						>
						<span
							class="text-white/90"
							style="text-shadow: 0 0 2px rgba(255,255,255,0.3), 0 0 6px rgba(255,255,255,0.1)"
						>
							&#123; Sparkles, BorderBeam, Marquee &#125;
						</span>
						<span
							class="text-[#ff7edb]"
							style="text-shadow: 0 0 2px #fff, 0 0 4px #ff00de, 0 0 8px #ff00de88">from</span
						>
						<span
							class="text-[#fede5d]"
							style="text-shadow: 0 0 2px #fff, 0 0 4px #f4d554, 0 0 8px #f4d55488"
						>
							'fancy-ui-svelte'</span
						>
					</div>
				</div>
			</div>

			<!-- MIT card -->
			<div
				class="col-span-3 flex flex-col justify-between rounded-3xl bg-zinc-900 p-8 sm:col-span-1"
			>
				<p class="text-sm font-medium text-zinc-500">License</p>
				<div>
					<p class="gradient-num-dark text-7xl leading-none font-black sm:text-8xl">MIT</p>
					<p class="mt-3 text-sm text-zinc-500">Open source forever</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ─── WHY FANCYUI — split layout (light bg) ────────────────────────────────── -->
<section class="bg-black px-4 py-24">
	<div class="mx-auto max-w-7xl">
		<div class="grid grid-cols-1 gap-16 lg:grid-cols-2">
			<!-- Sticky left: editorial heading -->
			<div class="lg:sticky lg:top-24 lg:self-start">
				<div class="mb-4">
					<span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase"
						>Why FancyUI</span
					>
				</div>
				<LineShadowText
					text="The fastest Svelte component library."
					class="text-4xl leading-tight font-bold tracking-tight text-white sm:text-5xl"
				/>
			</div>

			<!-- Right: BoxReveal blocs -->
			<div class="flex flex-col gap-12">
				<BoxReveal color="#000" duration={0.5}>
					<div class="rounded-2xl border border-white/10 bg-zinc-900 p-8">
						<div class="mb-4 text-2xl">⚡</div>
						<h3 class="mb-3 text-xl font-bold text-white">No Virtual DOM</h3>
						<p class="mb-6 leading-relaxed text-zinc-400">
							Svelte compiles to native JS. No runtime overhead, no reconciler. React ships 44 kb of
							runtime (gzipped) — FancyUI ships ~2 kb.
						</p>
						<div class="flex flex-col gap-2 text-xs">
							{#each [{ label: "FancyUI", kb: 2, pct: 5, color: "bg-purple-500" }, { label: "Vue 3", kb: 34, pct: 77, color: "bg-blue-400/60" }, { label: "React", kb: 44, pct: 100, color: "bg-zinc-600" }] as row}
								<div class="flex items-center gap-3">
									<span class="w-16 shrink-0 text-zinc-500">{row.label}</span>
									<div class="flex flex-1 items-center gap-2">
										<div class="{row.color} h-1.5 rounded-full" style="width:{row.pct}%"></div>
										<span class="text-zinc-500 tabular-nums">{row.kb} kb</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</BoxReveal>

				<BoxReveal color="#000" duration={0.5} delay={0.1}>
					<div class="rounded-2xl border border-white/10 bg-zinc-900 p-8">
						<div class="mb-4 text-2xl">🧩</div>
						<h3 class="mb-3 text-xl font-bold text-white">60+ components</h3>
						<p class="leading-relaxed text-zinc-400">
							More than similar libraries combined — all animated, all interactive, all built for
							Svelte 5 runes with full TypeScript support.
						</p>
						<div class="mt-6 flex flex-col gap-2 text-xs">
							{#each [{ label: "FancyUI", count: "60+", pct: 100, color: "bg-purple-500" }, { label: "Aceternity", count: "~50", pct: 83, color: "bg-zinc-600" }, { label: "Inspira", count: "~30", pct: 50, color: "bg-zinc-700" }] as row}
								<div class="flex items-center gap-3">
									<span class="w-16 shrink-0 text-zinc-500">{row.label}</span>
									<div class="flex flex-1 items-center gap-2">
										<div class="{row.color} h-1.5 rounded-full" style="width:{row.pct}%"></div>
										<span class="text-zinc-500 tabular-nums">{row.count}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</BoxReveal>

				<BoxReveal color="#000" duration={0.5} delay={0.2}>
					<div class="rounded-2xl border border-white/10 bg-zinc-900 p-8">
						<div class="mb-4 text-2xl">✍️</div>
						<h3 class="mb-3 text-xl font-bold text-white">Svelte 5 Runes</h3>
						<p class="leading-relaxed text-zinc-400">
							The simplest reactivity model. Just <code
								class="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-zinc-300"
								>$state</code
							>
							and
							<code class="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-zinc-300"
								>$derived</code
							>. No boilerplate, no complexity.
						</p>
					</div>
				</BoxReveal>
			</div>
		</div>
	</div>
</section>

<!-- ─── QUICK START (dark bg) ─────────────────────────────────────────────────── -->
<section class="bg-zinc-950 px-4 py-24">
	<div class="mx-auto max-w-2xl">
		<div class="mb-4 text-center">
			<span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Quick start</span>
		</div>
		<h2 class="mb-12 text-center text-4xl font-bold text-white sm:text-5xl">
			Up and running<br />in seconds.
		</h2>

		<div class="relative overflow-hidden rounded-2xl bg-[#0a0a12]">
			<BorderBeam
				duration={14}
				size={200}
				colorFrom="#9E7AFF"
				colorTo="#FE8BBB"
				borderWidth={1.5}
			/>
			<div class="p-8 font-mono text-sm leading-relaxed">
				<div class="mb-1 text-white/30"># 1. Install</div>
				<div
					class="mb-5 text-[#29becc]"
					style="text-shadow: 0 0 2px #fff, 0 0 4px #29becc, 0 0 8px #29becc88"
				>
					npm install fancy-ui-svelte
				</div>
				<div class="mb-1 text-white/30"># 2. Import any component</div>
				<div class="mb-5">
					<span
						class="text-[#ff7edb]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #ff00de, 0 0 8px #ff00de88">import</span
					>
					<span
						class="text-white/90"
						style="text-shadow: 0 0 2px rgba(255,255,255,0.3), 0 0 6px rgba(255,255,255,0.1)"
					>
						&#123; BorderBeam, Sparkles, Marquee &#125;
					</span>
					<span
						class="text-[#ff7edb]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #ff00de, 0 0 8px #ff00de88">from</span
					>
					<span
						class="text-[#fede5d]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #f4d554, 0 0 8px #f4d55488"
					>
						'fancy-ui-svelte'</span
					>
				</div>
				<div class="mb-1 text-white/30"># 3. Use it in your Svelte component</div>
				<div>
					<span
						class="text-[#36d7f7]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #29becc, 0 0 8px #29becc88"
						>&lt;BorderBeam</span
					>
					<span
						class="text-[#fede5d]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #f4d554, 0 0 8px #f4d55488"
					>
						colorFrom</span
					>
					<span class="text-white/90">=</span>
					<span
						class="text-[#85e89d]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #4dff7c, 0 0 8px #4dff7c88">"#9E7AFF"</span
					>
					<span
						class="text-[#fede5d]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #f4d554, 0 0 8px #f4d55488"
					>
						colorTo</span
					>
					<span class="text-white/90">=</span>
					<span
						class="text-[#85e89d]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #4dff7c, 0 0 8px #4dff7c88">"#FE8BBB"</span
					>
					<span
						class="text-[#36d7f7]"
						style="text-shadow: 0 0 2px #fff, 0 0 4px #29becc, 0 0 8px #29becc88"
					>
						/&gt;</span
					>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ─── ROADMAP (dark bg) ──────────────────────────────────────────────────────── -->
<section class="bg-zinc-950 px-4 pb-24">
	<Timeline
		items={roadmapItems}
		title="What's next"
		description="FancyUI is actively developed. Here's where we're headed."
	>
		{#snippet content(item)}
			{@const step = roadmapContent[item.id]}
			{#if step}
				<div class="mb-4 flex items-center gap-2">
					<h3 class="text-lg font-bold text-white md:hidden">{item.label}</h3>
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
								<span class="text-zinc-200">{entry.text}</span>
							{:else}
								<span class="mt-0.5 shrink-0 text-zinc-600">
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
								<span class="text-zinc-400">{entry.text}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{/snippet}
	</Timeline>
</section>

<!-- ─── CONTRIBUTORS (light bg) ───────────────────────────────────────────────── -->
<section class="bg-black px-4 py-24">
	<div class="mx-auto max-w-4xl text-center">
		<div class="mb-4">
			<span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Contributors</span
			>
		</div>
		<h2 class="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
			Built by the community
		</h2>
		<p class="mb-12 text-zinc-500">
			{contributors.length} contributor{contributors.length > 1 ? "s" : ""} and counting. Every PR welcome.
		</p>

		<!-- Animated tooltip avatars -->
		<div class="mb-12 flex justify-center">
			<AnimatedTooltip items={contributors} />
		</div>

		<!-- Contributor list -->
		<div class="mb-12 flex flex-wrap justify-center gap-3">
			{#each contributors as c}
				<a
					href="https://github.com/{c.login}"
					target="_blank"
					rel="noopener noreferrer"
					class="group flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition-all hover:border-white/20 hover:bg-white/10"
				>
					<img src={c.image} alt={c.name} class="size-6 rounded-full" />
					<span class="font-medium text-white/70 group-hover:text-white">{c.login}</span>
					<span class="text-xs text-white/30">{c.contributions}</span>
				</a>
			{/each}
		</div>

		<!-- CTA contribute -->
		<a
			href="{GITHUB_URL}/blob/main/CONTRIBUTING.md"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
				/>
			</svg>
			Become a contributor
		</a>
	</div>
</section>

<!-- ─── FINAL CTA (dark, synthwave) ───────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-black px-4 py-32 text-center">
	<SynthwaveGrid speed={0.7} verticalLines={16} horizontalLines={14} />
	<div class="relative z-10 flex flex-col items-center gap-6">
		<h2 class="text-4xl font-bold text-white sm:text-6xl">Start building today</h2>
		<p class="max-w-sm text-white/50">Free, open source, and ready for Svelte 5.</p>
		<div class="mt-2 flex flex-wrap justify-center gap-3">
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

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.gradient-num {
		background: linear-gradient(200deg, #646464 0%, #000 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	.gradient-num-dark {
		background: linear-gradient(200deg, #fff 0%, #a0a0a0 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	/* Selection: black bg + white text on light sections */
	:global(::selection) {
		background: #000;
		color: #fff;
		-webkit-text-fill-color: #fff;
	}
</style>
