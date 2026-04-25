<script lang="ts">
	import { FluidCursorAdvanced } from "$lib/fancy-ui/fluid-cursor";

	// ── Preview demos ────────────────────────────────────────────────────────────
	const demos = [
		{
			label: "Indigo / Pink / Cyan",
			props: {
				fluidColors: ["#6366f1", "#ec4899", "#06b6d4"],
				colorIntensity: 0.5,
				backColor: { r: 0.04, g: 0.04, b: 0.08 },
			},
		},
		{
			label: "Teal",
			props: { fluidColor: "#00ffcc", colorIntensity: 0.4, backColor: { r: 0, g: 0, b: 0 } },
		},
		{
			label: "Warm palette",
			props: {
				fluidColors: ["#ff6b35", "#f7c59f", "#ffaa40"],
				colorIntensity: 0.35,
				backColor: { r: 0.05, g: 0.02, b: 0 },
			},
		},
		{
			label: "Neon",
			props: {
				fluidColors: ["#ff0080", "#00ffcc", "#7700ff"],
				colorIntensity: 0.3,
				backColor: { r: 0, g: 0, b: 0 },
			},
		},
	];
	let activeDemo = $state(0);

	// ── Container picker ─────────────────────────────────────────────────────────
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

	// ── Autonomous mode ───────────────────────────────────────────────────────
	const speedOptions = [
		{ label: "Slow", ms: 3000 },
		{ label: "Normal", ms: 1500 },
		{ label: "Fast", ms: 600 },
	];
	let autonomousSpeed = $state(1500);

	// ── Splat on mount ────────────────────────────────────────────────────────
	let remountCounter = $state(0);
</script>

<svelte:head>
	<title>FluidCursorAdvanced — FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">FluidCursorAdvanced</h1>
	<p class="text-muted-foreground mb-8">
		WebGL fluid simulation confined to a parent container. Unlike <code
			class="bg-muted rounded px-1.5 py-0.5">FluidCursor</code
		>, it fills its parent element instead of covering the full viewport.
	</p>

	<!-- ── Preview ──────────────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Preview</h2>
		<div class="mb-4 flex flex-wrap gap-2">
			{#each demos as demo, i}
				<button
					class="rounded-md border px-3 py-1.5 text-sm transition-colors {i === activeDemo
						? 'bg-foreground text-background'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (activeDemo = i)}
				>
					{demo.label}
				</button>
			{/each}
		</div>
		<div class="relative h-64 overflow-hidden rounded-xl border">
			{#key activeDemo}
				<FluidCursorAdvanced {...demos[activeDemo].props} />
			{/key}
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<p class="text-muted-foreground text-sm">Move your cursor here</p>
			</div>
		</div>
	</section>

	<!-- ── Container picker ─────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-2 text-xl font-semibold">Pick a container</h2>
		<p class="text-muted-foreground mb-6 text-sm">
			Click any card to activate the fluid inside it — the simulation stays confined to that
			container. Click again to deactivate.
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
					{#if isActive}
						{#key c.id}
							<FluidCursorAdvanced
								fluidColors={c.colors}
								colorIntensity={c.intensity}
								simResolution={64}
							/>
						{/key}
					{/if}

					<div class="pointer-events-none relative z-10 flex h-full flex-col justify-between p-6">
						<div class="flex items-center justify-between">
							<span
								class="text-xs font-semibold tracking-widest uppercase transition-colors
									{isActive ? 'text-white/60' : 'text-white/30'}"
							>
								{isActive ? "Active" : "Click to activate"}
							</span>
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

	<!-- ── Autonomous mode ──────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-2 text-xl font-semibold">Autonomous mode</h2>
		<p class="text-muted-foreground mb-6 text-sm">
			Combine <code class="bg-muted rounded px-1.5 py-0.5">autoSplat</code> with
			<code class="bg-muted rounded px-1.5 py-0.5">interactive={`{false}`}</code> for a fluid
			background that animates without any cursor interaction — great for mobile and above-the-fold
			heroes.
		</p>

		<div class="mb-4 flex flex-wrap gap-2">
			{#each speedOptions as opt}
				<button
					class="rounded-md border px-3 py-1.5 text-sm transition-colors {opt.ms ===
					autonomousSpeed
						? 'bg-foreground text-background'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (autonomousSpeed = opt.ms)}
				>
					{opt.label}
				</button>
			{/each}
		</div>

		<div class="relative h-48 overflow-hidden rounded-xl border">
			{#key autonomousSpeed}
				<FluidCursorAdvanced
					autoSplat={true}
					autoSplatInterval={autonomousSpeed}
					interactive={false}
					fluidColors={["#6366f1", "#ec4899", "#06b6d4"]}
					colorIntensity={0.4}
					backColor={{ r: 0.04, g: 0.04, b: 0.08 }}
				/>
			{/key}
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<p class="text-muted-foreground text-sm">No cursor needed — works on mobile too</p>
			</div>
		</div>
	</section>

	<!-- ── Splat on mount ────────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-2 text-xl font-semibold">Splat on mount</h2>
		<p class="text-muted-foreground mb-6 text-sm">
			<code class="bg-muted rounded px-1.5 py-0.5">splatOnMount</code> fires 3–5 random splats the
			moment the component mounts — useful for an immediate "alive" feeling.
		</p>

		<div class="relative h-48 overflow-hidden rounded-xl border">
			{#key remountCounter}
				<FluidCursorAdvanced
					splatOnMount={true}
					fluidColors={["#ff6b35", "#f7c59f", "#ffaa40"]}
					colorIntensity={0.4}
					backColor={{ r: 0.05, g: 0.02, b: 0 }}
				/>
			{/key}
			<div class="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
				<p class="text-muted-foreground text-xs">Move your cursor to interact</p>
			</div>
		</div>
		<div class="mt-3 flex justify-center">
			<button
				class="bg-foreground text-background rounded-md px-4 py-2 text-sm transition-opacity hover:opacity-80"
				onclick={() => remountCounter++}
			>
				Remount
			</button>
		</div>
	</section>

	<!-- ── Usage ────────────────────────────────────────────────────────────────── -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<pre class="bg-muted overflow-x-auto rounded p-4 text-sm"><code
					>{"<"}script{">"}
  import {"{"} FluidCursorAdvanced {"}"} from 'fancy-ui';
{"<"}/script{">"}

{"<!-- Parent must be relative + overflow-hidden -->"}
{"<"}div class="relative h-64 overflow-hidden rounded-xl"{">"}
  {"<"}FluidCursorAdvanced
    fluidColors={"{"}{`["#6366f1", "#ec4899", "#06b6d4"]`}{"}"}
    colorIntensity={"{"}0.5{"}"}
    backColor={"{"}{`{ r: 0.04, g: 0.04, b: 0.08 }`}{"}"}
  /{">"}{"\n"}{"<"}/div{">"}</code
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
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">backColor</td>
						<td class="px-4 py-3 font-mono text-xs">{"{ r, g, b }"} | string</td>
						<td class="px-4 py-3 font-mono text-xs">{"{ r: 0.5, g: 0, b: 0 }"}</td>
						<td class="px-4 py-3">Background color — RGB object or hex string.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">densityDissipation</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">3.5</td>
						<td class="px-4 py-3">How quickly the dye fades.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">velocityDissipation</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">2</td>
						<td class="px-4 py-3">How quickly the velocity dissipates.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">curl</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">3</td>
						<td class="px-4 py-3">Curl/vorticity strength.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">splatRadius</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">0.2</td>
						<td class="px-4 py-3">Size of the splat effect.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">splatForce</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">6000</td>
						<td class="px-4 py-3">Force of the splat effect.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">shading</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">true</td>
						<td class="px-4 py-3">Enable lighting/shading effect.</td>
					</tr>
					<tr>
						<td class="px-4 py-3 font-mono text-xs">transparent</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">true</td>
						<td class="px-4 py-3">Enable transparent background.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">interactive</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">true</td>
						<td class="px-4 py-3"
							>When <code class="bg-muted rounded px-1 py-0.5">false</code>, removes all
							mouse/touch listeners. Combine with
							<code class="bg-muted rounded px-1 py-0.5">autoSplat</code> for ambient animations.</td
						>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">autoSplat</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">false</td>
						<td class="px-4 py-3">Fires random splats at a fixed interval without user interaction.</td
						>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">autoSplatInterval</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">1500</td>
						<td class="px-4 py-3">Interval in ms between auto splats.</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">splatOnMount</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">false</td>
						<td class="px-4 py-3">Fires 3–5 random splats when the component mounts.</td>
					</tr>
					<tr>
						<td class="px-4 py-3 font-mono text-xs">pauseWhenHidden</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">true</td>
						<td class="px-4 py-3"
							>Pauses the animation loop when the canvas is scrolled out of view.</td
						>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</div>
