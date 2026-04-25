<script lang="ts">
	import { FluidCursor, FluidCursorAdvanced } from "$lib/fancy-ui/fluid-cursor";

	// ── FluidCursor color demos ──────────────────────────────────────────────────
	const colorDemos = [
		{ label: "Default (random)", props: {} },
		{ label: "Fixed color — teal", props: { fluidColor: "#00ffcc", colorIntensity: 0.4 } },
		{
			label: "Palette cycling",
			props: { fluidColors: ["#ff0080", "#00ffcc", "#7700ff"], colorIntensity: 0.3 },
		},
		{
			label: "Warm palette",
			props: { fluidColors: ["#ff6b35", "#f7c59f", "#ffaa40"], colorIntensity: 0.35 },
		},
	];
	let activeColorDemo = $state(0);

	// ── FluidCursorAdvanced contained demo ───────────────────────────────────────
	const containers = [
		{
			id: "hero",
			label: "Hero card",
			sublabel: "Great as a section background",
			icon: "✦",
			bg: "linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 100%)",
			colors: ["#9E7AFF", "#6366f1", "#c084fc"],
			intensity: 0.35,
		},
		{
			id: "feature",
			label: "Feature card",
			sublabel: "Highlight key features",
			icon: "◈",
			bg: "linear-gradient(135deg, #001a1a 0%, #003333 100%)",
			colors: ["#00ffcc", "#06b6d4", "#22d3ee"],
			intensity: 0.35,
		},
		{
			id: "cta",
			label: "CTA card",
			sublabel: "Drive conversions",
			icon: "◆",
			bg: "linear-gradient(135deg, #1a0010 0%, #2d0020 100%)",
			colors: ["#ff0080", "#f43f5e", "#fb7185"],
			intensity: 0.35,
		},
	];
	let activeContainer = $state<string | null>(null);
</script>

<svelte:head>
	<title>FluidCursor - FancyUI</title>
</svelte:head>

<FluidCursor {...colorDemos[activeColorDemo].props} />

<div class="relative z-10 container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">FluidCursor</h1>
	<p class="text-muted-foreground mb-8">
		A WebGL fluid simulation that follows your cursor. Move your mouse around to see the effect.
	</p>

	<!-- ── Color demos ──────────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Color demos</h2>
		<div class="mb-4 flex flex-wrap gap-2">
			{#each colorDemos as demo, i}
				<button
					class="rounded-md border px-3 py-1.5 text-sm transition-colors {i === activeColorDemo
						? 'bg-white text-black'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (activeColorDemo = i)}
				>
					{demo.label}
				</button>
			{/each}
		</div>
		<div
			class="flex h-48 items-center justify-center rounded-lg border border-dashed border-white/10"
		>
			<p class="select-none text-sm text-white/20">Move your cursor anywhere</p>
		</div>
	</section>

	<!-- ── FluidCursorAdvanced — contained ──────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-2 text-xl font-semibold">FluidCursorAdvanced — Contained</h2>
		<p class="text-muted-foreground mb-6 text-sm">
			Click a card to activate the fluid effect inside it. The simulation stays confined to that
			container — move your cursor within the card to see it in action.
		</p>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{#each containers as c}
				{@const isActive = activeContainer === c.id}
				<button
					onclick={() => (activeContainer = isActive ? null : c.id)}
					class="group relative h-56 cursor-pointer overflow-hidden rounded-2xl border-2 text-left transition-all duration-200
						{isActive
						? 'border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.06)]'
						: 'border-white/10 hover:border-white/25'}"
					style="background: {c.bg}"
				>
					<!-- Fluid cursor lives here when active -->
					{#if isActive}
						{#key c.id}
							<FluidCursorAdvanced
								fluidColors={c.colors}
								colorIntensity={c.intensity}
								simResolution={64}
							/>
						{/key}
					{/if}

					<!-- Card content (pointer-events-none so hover passes through to button) -->
					<div
						class="pointer-events-none relative z-10 flex h-full flex-col justify-between p-6"
					>
						<div class="flex items-center justify-between">
							<span
								class="text-xs font-semibold tracking-widest uppercase transition-colors
									{isActive ? 'text-white/60' : 'text-white/30'}"
							>
								{isActive ? "Active" : "Click to activate"}
							</span>
							<!-- Active indicator -->
							<span
								class="size-2 rounded-full transition-all duration-300
									{isActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/10'}"
							></span>
						</div>

						<div>
							<p class="mb-1 text-3xl">{c.icon}</p>
							<p class="text-lg font-semibold text-white">{c.label}</p>
							<p class="mt-0.5 text-sm text-white/40">{c.sublabel}</p>
						</div>
					</div>
				</button>
			{/each}
		</div>

		{#if activeContainer}
			<p class="mt-3 text-center text-xs text-white/30">
				Move your cursor inside the card — the fluid stays contained ✦
			</p>
		{/if}
	</section>

	<!-- ── Usage ────────────────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<p class="text-muted-foreground mb-4 text-sm">
				<code class="bg-muted rounded px-1.5 py-0.5">FluidCursor</code> renders a full-screen WebGL
				canvas. <code class="bg-muted rounded px-1.5 py-0.5">FluidCursorAdvanced</code> shares the
				same props but confines the simulation to its parent container — just wrap it in a
				<code class="bg-muted rounded px-1.5 py-0.5">relative overflow-hidden</code> div.
			</p>
			<pre class="bg-muted overflow-x-auto rounded p-4 text-sm"><code
					>{"<"}script{">"}
  import {"{"} FluidCursor, FluidCursorAdvanced {"}"} from 'fancy-ui';
{"<"}/script{">"}

{"<!-- Full-screen (classic) -->"}
{"<"}FluidCursor fluidColor="#00ffcc" colorIntensity={"{"}0.4{"}"} /{">\n"}
{"<!-- Contained inside a card -->"}
{"<"}div class="relative overflow-hidden rounded-2xl h-64"{">"}
  {"<"}FluidCursorAdvanced fluidColors={"{"}{`["#9E7AFF", "#6366f1"]`}{"}"} colorIntensity={"{"}0.35{"}"} /{">"} 
  {"<"}div class="relative z-10 p-6"{">"} Your content here {"<"}/div{">"}
{"<"}/div{">"}</code
				></pre>
		</div>
	</section>

	<!-- ── Props ────────────────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Props</h2>
		<div class="bg-card overflow-x-auto rounded-lg border">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b">
						<th class="px-4 py-3 text-left font-medium">Prop</th>
						<th class="px-4 py-3 text-left font-medium">Type</th>
						<th class="px-4 py-3 text-left font-medium">Default</th>
						<th class="px-4 py-3 text-left font-medium">Description</th>
					</tr>
				</thead>
				<tbody>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">simResolution</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">128</td>
						<td class="px-4 py-3">Simulation resolution</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">dyeResolution</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">1440</td>
						<td class="px-4 py-3">Dye resolution for color rendering</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">densityDissipation</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">3.5</td>
						<td class="px-4 py-3">How quickly the dye fades</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">velocityDissipation</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">2</td>
						<td class="px-4 py-3">How quickly the velocity dissipates</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">pressure</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">0.1</td>
						<td class="px-4 py-3">Pressure value for simulation</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">curl</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">3</td>
						<td class="px-4 py-3">Curl/vorticity strength</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">splatRadius</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">0.2</td>
						<td class="px-4 py-3">Size of the splat effect</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">splatForce</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">6000</td>
						<td class="px-4 py-3">Force of the splat effect</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">shading</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">true</td>
						<td class="px-4 py-3">Enable lighting/shading effect</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">colorUpdateSpeed</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">10</td>
						<td class="px-4 py-3">Speed of color cycling</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">transparent</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">true</td>
						<td class="px-4 py-3">Enable transparent background</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">fluidColor</td>
						<td class="px-4 py-3 font-mono text-xs">string</td>
						<td class="px-4 py-3 font-mono text-xs">—</td>
						<td class="px-4 py-3">Fixed fluid color (hex). Disables random cycling.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">fluidColors</td>
						<td class="px-4 py-3 font-mono text-xs">string[]</td>
						<td class="px-4 py-3 font-mono text-xs">—</td>
						<td class="px-4 py-3">Palette of hex colors to cycle through on each splat.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">colorIntensity</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">0.15</td>
						<td class="px-4 py-3">Intensity multiplier applied to fluid colors (0–1).</td>
					</tr>
					<tr>
						<td class="px-4 py-3 font-mono text-xs">backColor</td>
						<td class="px-4 py-3 font-mono text-xs">{"{ r, g, b }"} | string</td>
						<td class="px-4 py-3 font-mono text-xs">{"{ r: 0.5, g: 0, b: 0 }"}</td>
						<td class="px-4 py-3">Background color — RGB object or hex string.</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- ── Notes ────────────────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Notes</h2>
		<div class="bg-card rounded-lg border p-6">
			<ul class="text-muted-foreground list-inside list-disc space-y-2 text-sm">
				<li>The component uses WebGL2 with fallback to WebGL1</li>
				<li>Click to create a color splat effect</li>
				<li>Move your mouse to create flowing fluid trails</li>
				<li>Touch events are supported for mobile devices</li>
				<li>The canvas automatically resizes with the window</li>
				<li>
					<code class="bg-muted rounded px-1">FluidCursorAdvanced</code> requires a parent with
					<code class="bg-muted rounded px-1">position: relative</code> and
					<code class="bg-muted rounded px-1">overflow: hidden</code>
				</li>
			</ul>
		</div>
	</section>
</div>
