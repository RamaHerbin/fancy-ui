<script lang="ts">
	import { GradientButton, ShimmerButton, BorderBeam } from "$lib/fancy-ui";
	import { t } from "$lib/stores";

	// ─── Base light/dark token sets (mirror src/routes/layout.css) ──────────────
	const bases = {
		light: {
			background: "oklch(1 0 0)",
			foreground: "oklch(0.129 0.042 264.695)",
			card: "oklch(1 0 0)",
			mutedForeground: "oklch(0.554 0.046 257.417)",
			border: "oklch(0.929 0.013 255.508)",
		},
		dark: {
			background: "oklch(0.05 0 0)",
			foreground: "oklch(0.984 0.003 247.858)",
			card: "oklch(0.1 0.005 265)",
			mutedForeground: "oklch(0.704 0.04 256.788)",
			border: "oklch(1 0 0 / 8%)",
		},
	} as const;

	type Preset = {
		base: "light" | "dark";
		primary: [number, number, number]; // oklch L C H
		accent: [number, number, number];
		radius: number; // rem
		anim: number; // ms
		rainbow: [number, number, number, number, number]; // 5 HSL hues
	};

	const presets: Record<string, Preset> = {
		Default: {
			base: "light",
			primary: [0.208, 0.042, 265.8],
			accent: [0.65, 0.15, 265],
			radius: 0.625,
			anim: 300,
			rainbow: [0, 270, 210, 195, 90],
		},
		Sunset: {
			base: "dark",
			primary: [0.62, 0.19, 30],
			accent: [0.7, 0.17, 8],
			radius: 1.0,
			anim: 400,
			rainbow: [12, 30, 350, 320, 50],
		},
		Ocean: {
			base: "light",
			primary: [0.55, 0.13, 230],
			accent: [0.72, 0.13, 190],
			radius: 0.5,
			anim: 300,
			rainbow: [200, 220, 180, 240, 160],
		},
		Mono: {
			base: "dark",
			primary: [0.32, 0.0, 0],
			accent: [0.6, 0.0, 0],
			radius: 0.25,
			anim: 200,
			rainbow: [240, 235, 245, 230, 250],
		},
	};

	// ─── State ──────────────────────────────────────────────────────────────────
	let base = $state<"light" | "dark">("light");
	let primary = $state<[number, number, number]>([0.208, 0.042, 265.8]);
	let accent = $state<[number, number, number]>([0.65, 0.15, 265]);
	let radius = $state(0.625);
	let anim = $state(300);
	let rainbow = $state<[number, number, number, number, number]>([0, 270, 210, 195, 90]);
	let copied = $state(false);

	const modes = ["light", "dark"] as const;

	function applyPreset(name: string) {
		const p = presets[name];
		base = p.base;
		primary = [...p.primary];
		accent = [...p.accent];
		radius = p.radius;
		anim = p.anim;
		rainbow = [...p.rainbow];
	}

	// ─── Derived values ──────────────────────────────────────────────────────────
	const okl = (v: [number, number, number]) => `oklch(${v[0]} ${v[1]} ${v[2]})`;
	// Foreground that reads on top of a given lightness.
	const fgFor = (L: number) => (L >= 0.6 ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)");
	const hslRainbow = (h: number) => `hsl(${h} 100% 63%)`;

	const primaryColor = $derived(okl(primary));
	const accentColor = $derived(okl(accent));
	const primaryFg = $derived(fgFor(primary[0]));
	const accentFg = $derived(fgFor(accent[0]));
	const rainbowColors = $derived(rainbow.map(hslRainbow));

	// Inline CSS custom properties applied to the scoped preview container.
	const previewStyle = $derived(
		[
			`--background:${bases[base].background}`,
			`--foreground:${bases[base].foreground}`,
			`--card:${bases[base].card}`,
			`--muted-foreground:${bases[base].mutedForeground}`,
			`--border:${bases[base].border}`,
			`--primary:${primaryColor}`,
			`--primary-foreground:${primaryFg}`,
			`--accent:${accentColor}`,
			`--accent-foreground:${accentFg}`,
			`--radius:${radius}rem`,
			`--animation-normal:${anim}ms`,
			`--rainbow-1:${hslRainbow(rainbow[0])}`,
			`--rainbow-2:${hslRainbow(rainbow[1])}`,
			`--rainbow-3:${hslRainbow(rainbow[2])}`,
			`--rainbow-4:${hslRainbow(rainbow[3])}`,
			`--rainbow-5:${hslRainbow(rainbow[4])}`,
		].join(";")
	);

	// ─── Copy-paste CSS output ────────────────────────────────────────────────────
	// Dark-base themes are emitted under `.dark` (matching the app's dark selector)
	// so the surface tokens land where the preview shows them, not in `:root`.
	const selector = $derived(base === "dark" ? ".dark" : ":root");
	const cssOutput = $derived(
		`@import "tailwindcss";
@import "fancy-ui-svelte/tailwind.css";
/* Assumes a shadcn-svelte-style setup that maps these tokens to Tailwind theme
   colors via @theme inline (e.g. --color-primary: var(--primary)). See Theming. */

${selector} {
	/* Surface (base: ${base}) */
	--background: ${bases[base].background};
	--foreground: ${bases[base].foreground};
	--card: ${bases[base].card};
	--muted-foreground: ${bases[base].mutedForeground};
	--border: ${bases[base].border};

	/* Brand */
	--primary: ${primaryColor};
	--primary-foreground: ${primaryFg};
	--accent: ${accentColor};
	--accent-foreground: ${accentFg};

	/* Shape & motion (mode-independent — move to :root if you theme both modes) */
	--radius: ${radius}rem;
	--animation-normal: ${anim}ms;

	/* Rainbow palette (gradient effects, e.g. GradientButton / --gradient-rainbow) */
	--rainbow-1: ${hslRainbow(rainbow[0])};
	--rainbow-2: ${hslRainbow(rainbow[1])};
	--rainbow-3: ${hslRainbow(rainbow[2])};
	--rainbow-4: ${hslRainbow(rainbow[3])};
	--rainbow-5: ${hslRainbow(rainbow[4])};
}
`
	);

	async function copyCss() {
		try {
			await navigator.clipboard.writeText(cssOutput);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head>
	<title>{t("page.themeGenerator")} - FancyUI Docs</title>
	<meta name="description" content={t("tg.metaDescription")} />
</svelte:head>

<h1>{t("page.themeGenerator")}</h1>

<p>
	{t("tg.intro")}
	{t("tg.seeTheming")}
	<a href="/docs/getting-started/theming">{t("page.theming")}</a>.
</p>

<!-- ─── Presets ─────────────────────────────────────────────────────────────── -->
<div class="not-prose mt-8 flex flex-wrap items-center gap-2">
	<span class="text-muted-foreground mr-1 text-xs font-semibold tracking-wider uppercase">
		{t("tg.presets")}
	</span>
	{#each Object.keys(presets) as name}
		<button
			type="button"
			onclick={() => applyPreset(name)}
			class="border-border text-foreground hover:bg-accent hover:text-accent-foreground rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
		>
			{name}
		</button>
	{/each}
</div>

<!-- ─── Controls + live preview ─────────────────────────────────────────────── -->
<div class="not-prose mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
	<!-- Controls -->
	<div class="border-border bg-card flex flex-col gap-6 rounded-2xl border p-5">
		<!-- Base mode -->
		<div>
			<div class="text-foreground mb-2 text-sm font-semibold">{t("tg.base")}</div>
			<div class="border-border inline-flex overflow-hidden rounded-lg border">
				{#each modes as mode}
					<button
						type="button"
						onclick={() => (base = mode)}
						class="px-4 py-1.5 text-sm font-medium capitalize transition-colors {base === mode
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						{mode === "light" ? t("tg.light") : t("tg.dark")}
					</button>
				{/each}
			</div>
		</div>

		<!-- Primary color (oklch) -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-foreground text-sm font-semibold">{t("tg.primary")}</span>
				<span
					class="border-border size-6 rounded-md border"
					style="background:{primaryColor}"
					aria-hidden="true"
				></span>
			</div>
			<div class="flex flex-col gap-2">
				<label class="flex items-center gap-3 text-xs">
					<span class="text-muted-foreground w-16 shrink-0">{t("tg.lightness")}</span>
					<input type="range" min="0" max="1" step="0.005" bind:value={primary[0]} class="flex-1" />
					<span class="text-muted-foreground w-10 text-right tabular-nums"
						>{primary[0].toFixed(2)}</span
					>
				</label>
				<label class="flex items-center gap-3 text-xs">
					<span class="text-muted-foreground w-16 shrink-0">{t("tg.chroma")}</span>
					<input
						type="range"
						min="0"
						max="0.37"
						step="0.005"
						bind:value={primary[1]}
						class="flex-1"
					/>
					<span class="text-muted-foreground w-10 text-right tabular-nums"
						>{primary[1].toFixed(2)}</span
					>
				</label>
				<label class="flex items-center gap-3 text-xs">
					<span class="text-muted-foreground w-16 shrink-0">{t("tg.hue")}</span>
					<input type="range" min="0" max="360" step="1" bind:value={primary[2]} class="flex-1" />
					<span class="text-muted-foreground w-10 text-right tabular-nums"
						>{Math.round(primary[2])}</span
					>
				</label>
			</div>
		</div>

		<!-- Accent color (oklch) -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-foreground text-sm font-semibold">{t("tg.accent")}</span>
				<span
					class="border-border size-6 rounded-md border"
					style="background:{accentColor}"
					aria-hidden="true"
				></span>
			</div>
			<div class="flex flex-col gap-2">
				<label class="flex items-center gap-3 text-xs">
					<span class="text-muted-foreground w-16 shrink-0">{t("tg.lightness")}</span>
					<input type="range" min="0" max="1" step="0.005" bind:value={accent[0]} class="flex-1" />
					<span class="text-muted-foreground w-10 text-right tabular-nums"
						>{accent[0].toFixed(2)}</span
					>
				</label>
				<label class="flex items-center gap-3 text-xs">
					<span class="text-muted-foreground w-16 shrink-0">{t("tg.chroma")}</span>
					<input
						type="range"
						min="0"
						max="0.37"
						step="0.005"
						bind:value={accent[1]}
						class="flex-1"
					/>
					<span class="text-muted-foreground w-10 text-right tabular-nums"
						>{accent[1].toFixed(2)}</span
					>
				</label>
				<label class="flex items-center gap-3 text-xs">
					<span class="text-muted-foreground w-16 shrink-0">{t("tg.hue")}</span>
					<input type="range" min="0" max="360" step="1" bind:value={accent[2]} class="flex-1" />
					<span class="text-muted-foreground w-10 text-right tabular-nums"
						>{Math.round(accent[2])}</span
					>
				</label>
			</div>
		</div>

		<!-- Radius -->
		<div>
			<label class="flex items-center gap-3">
				<span class="text-foreground w-16 shrink-0 text-sm font-semibold">{t("tg.radius")}</span>
				<input type="range" min="0" max="1.5" step="0.025" bind:value={radius} class="flex-1" />
				<span class="text-muted-foreground w-14 text-right text-xs tabular-nums">{radius}rem</span>
			</label>
		</div>

		<!-- Animation speed -->
		<div>
			<label class="flex items-center gap-3">
				<span class="text-foreground w-16 shrink-0 text-sm font-semibold">{t("tg.motion")}</span>
				<input type="range" min="100" max="800" step="25" bind:value={anim} class="flex-1" />
				<span class="text-muted-foreground w-14 text-right text-xs tabular-nums">{anim}ms</span>
			</label>
		</div>

		<!-- Rainbow palette -->
		<div>
			<div class="text-foreground mb-2 text-sm font-semibold">{t("tg.rainbowPalette")}</div>
			<div class="flex flex-col gap-2">
				{#each rainbow as hue, i}
					<label class="flex items-center gap-3 text-xs">
						<span
							class="border-border size-5 shrink-0 rounded border"
							style="background:{hslRainbow(hue)}"
							aria-hidden="true"
						></span>
						<input type="range" min="0" max="360" step="1" bind:value={rainbow[i]} class="flex-1" />
						<span class="text-muted-foreground w-10 text-right tabular-nums">{Math.round(hue)}</span
						>
					</label>
				{/each}
			</div>
		</div>
	</div>

	<!-- Live preview -->
	<div
		class="live-preview flex flex-col gap-6 rounded-2xl border p-6 {base === 'dark' ? 'dark' : ''}"
		style={previewStyle}
	>
		<div class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
			{t("tg.livePreview")}
		</div>

		<!-- Themed card -->
		<div
			class="bg-card border-border flex flex-col gap-4 border p-5"
			style="border-radius:var(--radius)"
		>
			<div>
				<div class="text-foreground text-lg font-semibold">{t("tg.cardSurface")}</div>
				<div class="text-muted-foreground text-sm">{t("tg.cardSurfaceDesc")}</div>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					class="hover-motion px-4 py-2 text-sm font-medium"
					style="background:var(--primary);color:var(--primary-foreground);border-radius:var(--radius)"
				>
					{t("tg.primaryAction")}
				</button>
				<span
					class="px-3 py-1 text-xs font-medium"
					style="background:var(--accent);color:var(--accent-foreground);border-radius:var(--radius)"
				>
					{t("tg.accentBadge")}
				</span>
			</div>
		</div>

		<!-- BorderBeam card — beam colors follow the tuned Primary → Accent -->
		<div class="bg-card relative overflow-hidden p-5" style="border-radius:var(--radius)">
			<BorderBeam
				duration={8}
				size={160}
				colorFrom={primaryColor}
				colorTo={accentColor}
				borderWidth={1.5}
			/>
			<div class="text-foreground text-sm font-semibold">BorderBeam</div>
			<div class="text-muted-foreground text-xs">{t("tg.beamDesc")}</div>
		</div>

		<!-- Rainbow palette — swatches (direct) + GradientButton (consumes the palette) -->
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-1.5">
				{#each rainbowColors as c}
					<span class="h-6 flex-1 rounded" style="background:{c}"></span>
				{/each}
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<GradientButton colors={rainbowColors}>Gradient</GradientButton>
				<ShimmerButton background={primaryColor} shimmerColor={primaryFg}>Shimmer</ShimmerButton>
			</div>
		</div>
	</div>
</div>

<!-- ─── CSS output ──────────────────────────────────────────────────────────── -->
<div class="not-prose mt-8">
	<div class="mb-2 flex items-center justify-between">
		<span class="text-foreground text-sm font-semibold">{t("tg.generatedCss")}</span>
		<button
			type="button"
			onclick={copyCss}
			class="border-border text-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
		>
			{#if copied}
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
				{t("tg.copied")}
			{:else}
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
				{t("tg.copyCss")}
			{/if}
		</button>
	</div>
	<pre class="!mt-0"><code>{cssOutput}</code></pre>
</div>

<style>
	.live-preview {
		background: var(--background);
		border-color: var(--border);
		transition: background var(--animation-normal, 300ms) ease;
	}
	.hover-motion {
		transition:
			transform var(--animation-normal, 300ms) ease,
			filter var(--animation-normal, 300ms) ease;
	}
	.hover-motion:hover {
		transform: translateY(-2px);
		filter: brightness(1.1);
	}
	/* Range inputs pick up the tuned primary as their accent color. */
	.not-prose input[type="range"] {
		accent-color: var(--primary);
		cursor: pointer;
	}
</style>
