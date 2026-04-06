<script lang="ts">
	import { SparklesText } from "$lib/fancy-ui/sparkles-text";
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";
	import { Meteors } from "$lib/fancy-ui/meteors";
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";
	import { RainbowButton } from "$lib/fancy-ui/rainbow-button";
	import { BoxReveal } from "$lib/fancy-ui/box-reveal";
	import { Check, Minus } from "@lucide/svelte";

	const libraries = [
		{
			name: "FancyUI",
			tagline: "The Svelte choice",
			framework: "Svelte 5",
			bundle: "~2 kb",
			bundleBytes: 2,
			popular: true,
			cta: "Get started free",
			features: {
				svelte5Runes: true,
				tailwindV4: true,
				typescript: true,
				noVirtualDom: true,
				npmPackage: true,
				designSystem: true,
				components: "60+",
				figmaFiles: true,
			},
		},
		{
			name: "Aceternity UI",
			tagline: "For React projects",
			framework: "React",
			bundle: "~130 kb",
			bundleBytes: 130,
			popular: false,
			cta: "Visit site",
			features: {
				svelte5Runes: false,
				tailwindV4: false,
				typescript: true,
				noVirtualDom: false,
				npmPackage: false,
				designSystem: false,
				components: "~50",
				figmaFiles: false,
			},
		},
		{
			name: "Inspira UI",
			tagline: "For Vue projects",
			framework: "Vue 3",
			bundle: "~34 kb",
			bundleBytes: 34,
			popular: false,
			cta: "Visit site",
			features: {
				svelte5Runes: false,
				tailwindV4: false,
				typescript: true,
				noVirtualDom: false,
				npmPackage: false,
				designSystem: false,
				components: "~30",
				figmaFiles: false,
			},
		},
	];

	const featureRows: [string, boolean | string, boolean | string, boolean | string][] = [
		["Framework", "Svelte 5", "React", "Vue 3"],
		["Tailwind CSS v4", true, false, false],
		["npm installable", true, false, false],
		["No Virtual DOM", true, false, false],
		["Bundle size", "~2 kb", "~130 kb", "~34 kb"],
		["Number of components", "60+", "~50", "~30"],
		["Consistent design system", true, false, false],
		["TypeScript", true, true, true],
		["Open source", true, true, true],
		["Figma files", true, false, false],
	];
</script>

<svelte:head>
	<title>Compare — FancyUI vs Aceternity UI vs Inspira UI</title>
</svelte:head>

<!-- ── Page wrapper ──────────────────────────────────────────── -->
<div class="bg-background relative min-h-screen overflow-hidden">
	<!-- Subtle grid background -->
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.03]"
		style="background-image: linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px); background-size: 48px 48px;"
	></div>

	<div class="relative mx-auto max-w-6xl px-4 py-24">
		<!-- ── Hero ─────────────────────────────────────────────── -->
		<div class="mb-20 text-center">
			<div class="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
				<span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
				<span class="text-muted-foreground">Built on Svelte 5</span>
			</div>

			<h1 class="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
				<SparklesText
					text="The smartest choice"
					colors={{ first: "#a855f7", second: "#3b82f6" }}
					class="inline"
				/>
				<br />
				<span class="text-foreground">for UI</span>
			</h1>

			<p class="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
				Faster. More components. Better designed.
			</p>
		</div>

		<!-- ── Stats section ─────────────────────────────────────── -->
		<div class="mb-24">
			<h2 class="mb-10 text-center text-3xl font-bold">The numbers speak</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<!-- FancyUI stat card -->
				<div
					class="bg-card relative flex flex-col items-center rounded-2xl border border-transparent p-8 text-center shadow-2xl shadow-purple-500/10"
				>
					<GlowBorder color={["#a855f7", "#3b82f6", "#06b6d4"]} borderRadius={16} borderWidth={1} />
					<BorderBeam size={200} duration={4} colorFrom="#a855f7" colorTo="#3b82f6" />
					<div class="mb-2 text-xs font-semibold tracking-widest text-purple-400 uppercase">
						FancyUI
					</div>
					<div class="text-foreground mb-1 flex items-end gap-1 text-5xl font-bold">
						<NumberTicker value={60} duration={1200} />
						<span class="mb-1 text-2xl">+</span>
					</div>
					<div class="text-muted-foreground text-sm">components</div>
					<div class="mt-4 text-xs font-semibold text-purple-400">~2 kb runtime</div>
				</div>

				<!-- Aceternity stat card -->
				<div
					class="bg-card/50 relative flex flex-col items-center rounded-2xl border p-8 text-center"
				>
					<div class="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
						Aceternity UI
					</div>
					<div class="text-foreground mb-1 flex items-end gap-1 text-5xl font-bold">
						<span>~</span><NumberTicker value={50} duration={1200} />
					</div>
					<div class="text-muted-foreground text-sm">components</div>
					<div class="text-muted-foreground mt-4 text-xs">~130 kb runtime (React)</div>
				</div>

				<!-- Inspira stat card -->
				<div
					class="bg-card/50 relative flex flex-col items-center rounded-2xl border p-8 text-center"
				>
					<div class="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
						Inspira UI
					</div>
					<div class="text-foreground mb-1 flex items-end gap-1 text-5xl font-bold">
						<span>~</span><NumberTicker value={30} duration={1200} />
					</div>
					<div class="text-muted-foreground text-sm">components</div>
					<div class="text-muted-foreground mt-4 text-xs">~34 kb runtime (Vue 3)</div>
				</div>
			</div>

			<!-- Bundle size visual comparison -->
			<div class="mt-10 rounded-2xl border p-8">
				<h3
					class="text-muted-foreground mb-6 text-center text-sm font-semibold tracking-widest uppercase"
				>
					Bundle size comparison
				</h3>
				<div class="flex flex-col gap-4">
					{#each [{ name: "FancyUI", kb: 2, color: "bg-purple-500" }, { name: "Inspira UI", kb: 34, color: "bg-blue-400" }, { name: "Aceternity UI", kb: 130, color: "bg-zinc-500" }] as lib}
						<div class="flex items-center gap-4">
							<div class="w-28 shrink-0 text-right text-sm font-medium">{lib.name}</div>
							<div class="flex flex-1 items-center gap-3">
								<div
									class="{lib.color} h-6 rounded-full transition-all duration-700"
									style="width: {(lib.kb / 130) * 100}%"
								></div>
								<span class="text-muted-foreground text-sm whitespace-nowrap tabular-nums"
									>{lib.kb} kb</span
								>
							</div>
						</div>
					{/each}
				</div>
				<p class="text-muted-foreground mt-4 text-center text-xs">
					Gzipped runtime bundle. Smaller = faster first load.
				</p>
			</div>
		</div>

		<!-- ── Library cards ─────────────────────────────────────── -->
		<div class="mb-24 grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each libraries as lib}
				<div
					class="relative flex flex-col rounded-2xl border p-8 transition-all duration-300
					{lib.popular
						? 'bg-card border-transparent shadow-2xl shadow-purple-500/10'
						: 'bg-card/50 hover:bg-card'}"
				>
					{#if lib.popular}
						<GlowBorder
							color={["#a855f7", "#3b82f6", "#06b6d4"]}
							borderRadius={16}
							borderWidth={1}
						/>
						<BorderBeam size={250} duration={4} colorFrom="#a855f7" colorTo="#3b82f6" />
						<div
							class="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-1 text-xs font-semibold text-white shadow-lg"
						>
							Best choice
						</div>
					{/if}

					<!-- Header -->
					<div class="mb-6">
						<h2 class="text-foreground mb-1 text-xl font-bold">{lib.name}</h2>
						<p class="text-muted-foreground text-sm">{lib.tagline}</p>
					</div>

					<!-- Framework + bundle -->
					<div class="mb-8">
						<div class="text-foreground text-3xl font-bold">{lib.framework}</div>
						<p class="text-muted-foreground mt-1 text-sm">{lib.bundle} runtime bundle</p>
					</div>

					<!-- CTA -->
					<div class="mb-8">
						{#if lib.popular}
							<RainbowButton class="w-full justify-center text-sm font-semibold">
								{lib.cta}
							</RainbowButton>
						{:else}
							<ShimmerButton
								class="w-full justify-center text-sm"
								shimmerColor="#6b7280"
								background="rgba(107, 114, 128, 0.08)"
							>
								{lib.cta}
							</ShimmerButton>
						{/if}
					</div>

					<div class="bg-border mb-6 h-px"></div>

					<!-- Feature list -->
					<ul class="flex flex-col gap-3">
						{#each [["Svelte 5 runes", lib.features.svelte5Runes], ["Tailwind CSS v4", lib.features.tailwindV4], ["TypeScript native", lib.features.typescript], ["No Virtual DOM", lib.features.noVirtualDom], ["npm package", lib.features.npmPackage], ["Design system", lib.features.designSystem], [lib.features.components + " components", true]] as [label, val]}
							<li class="flex items-start gap-3">
								{#if val}
									<Check
										size={16}
										class="mt-0.5 shrink-0 {lib.popular ? 'text-purple-400' : 'text-emerald-400'}"
									/>
								{:else}
									<Minus size={16} class="text-muted-foreground/30 mt-0.5 shrink-0" />
								{/if}
								<span class="text-muted-foreground text-sm {!val ? 'line-through opacity-40' : ''}"
									>{label}</span
								>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<!-- ── Performance section ───────────────────────────────── -->
		<div class="mb-24">
			<h2 class="mb-4 text-center text-3xl font-bold">Why Svelte changes everything</h2>
			<p class="text-muted-foreground mb-12 text-center text-base">
				Even if you're new to web dev — here's why this matters.
			</p>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				<!-- Block 1 -->
				<div class="rounded-2xl border p-8">
					<BoxReveal color="#a855f7" duration={0.5} delay={0.1}>
						<div>
							<div class="mb-4 text-3xl">⚡</div>
							<h3 class="text-foreground mb-3 text-lg font-bold">No Virtual DOM</h3>
							<p class="text-muted-foreground text-sm leading-relaxed">
								React and Vue recalculate a virtual tree on every change. Svelte compiles directly
								to native JS — zero overhead at runtime.
							</p>
						</div>
					</BoxReveal>
				</div>

				<!-- Block 2 -->
				<div class="rounded-2xl border p-8">
					<BoxReveal color="#3b82f6" duration={0.5} delay={0.2}>
						<div>
							<div class="mb-4 text-3xl">🪶</div>
							<h3 class="text-foreground mb-3 text-lg font-bold">60× lighter bundle</h3>
							<p class="text-muted-foreground mb-4 text-sm leading-relaxed">
								React ships ~130 kb of runtime to every visitor. Svelte ships ~2 kb. Faster loads,
								better Core Web Vitals.
							</p>
							<div class="flex flex-col gap-2 text-xs">
								<div class="flex items-center gap-2">
									<div class="h-2 w-2 shrink-0 rounded-full bg-purple-500"></div>
									<span class="text-muted-foreground">FancyUI — 2 kb</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="h-2 w-2 shrink-0 rounded-full bg-zinc-500"></div>
									<span class="text-muted-foreground">React — 130 kb</span>
								</div>
							</div>
						</div>
					</BoxReveal>
				</div>

				<!-- Block 3 -->
				<div class="rounded-2xl border p-8">
					<BoxReveal color="#06b6d4" duration={0.5} delay={0.3}>
						<div>
							<div class="mb-4 text-3xl">✍️</div>
							<h3 class="text-foreground mb-3 text-lg font-bold">Svelte 5 Runes</h3>
							<p class="text-muted-foreground text-sm leading-relaxed">
								The simplest reactivity model to write. No hooks, no dependency arrays — just
								<code class="bg-muted rounded px-1 py-0.5 font-mono text-xs">$state</code> and
								<code class="bg-muted rounded px-1 py-0.5 font-mono text-xs">$derived</code>.
							</p>
						</div>
					</BoxReveal>
				</div>
			</div>
		</div>

		<!-- ── Comparison table ──────────────────────────────────── -->
		<div class="mb-24">
			<h2 class="mb-10 text-center text-3xl font-bold">Detailed comparison</h2>
			<div class="overflow-x-auto rounded-2xl border">
				<table class="w-full text-sm">
					<thead>
						<tr class="bg-muted/50 border-b">
							<th class="px-6 py-4 text-left font-medium">Feature</th>
							{#each libraries as lib}
								<th
									class="px-6 py-4 text-center font-semibold {lib.popular
										? 'text-purple-400'
										: 'text-foreground'}"
								>
									{lib.name}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each featureRows as row}
							{@const [label, ...values] = row}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-muted-foreground px-6 py-3">{label}</td>
								{#each values as val}
									<td class="px-6 py-3 text-center">
										{#if val === true}
											<Check size={16} class="mx-auto text-emerald-400" />
										{:else if val === false}
											<span class="text-muted-foreground/30 text-lg leading-none">—</span>
										{:else}
											<span class="text-foreground font-medium">{val}</span>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- ── Bottom CTA ─────────────────────────────────────────── -->
		<div class="relative overflow-hidden rounded-2xl border p-12 text-center">
			<Meteors count={12} />
			<div class="relative z-10">
				<h2 class="mb-3 text-3xl font-bold">Start building with FancyUI</h2>
				<p class="text-muted-foreground mb-8 text-base">
					The fastest, lightest, most complete Svelte component library.
				</p>
				<div class="flex flex-wrap items-center justify-center gap-4">
					<RainbowButton href="/demo">Get started free</RainbowButton>
					<a
						href="/demo"
						class="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
					>
						Browse components →
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
