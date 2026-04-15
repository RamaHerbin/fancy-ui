<script lang="ts">
	import { FluidCursor, FluidCursorAdvanced } from "$lib/fancy-ui/fluid-cursor";

	const demos = [
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

	let activeDemo = $state(0);
</script>

<svelte:head>
	<title>FluidCursor - FancyUI</title>
</svelte:head>

<FluidCursor {...demos[activeDemo].props} />

<div class="relative z-10 container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">FluidCursor</h1>
	<p class="text-muted-foreground mb-8">
		A WebGL fluid simulation that follows your cursor. Move your mouse around to see the effect.
	</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Color demos</h2>
		<div class="mb-4 flex flex-wrap gap-2">
			{#each demos as demo, i}
				<button
					class="rounded-md border px-3 py-1.5 text-sm transition-colors {i === activeDemo
						? 'bg-white text-black'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (activeDemo = i)}
				>
					{demo.label}
				</button>
			{/each}
		</div>
		<div
			class="flex h-48 items-center justify-center rounded-lg border border-dashed border-white/10"
		>
			<p class="text-sm text-white/20 select-none">Move your cursor anywhere</p>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">FluidCursorAdvanced — Contained</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			<code class="bg-muted rounded px-1.5 py-0.5">FluidCursorAdvanced</code> confines the fluid canvas
			to a specific element instead of covering the full viewport. Wrap it in a
			<code class="bg-muted rounded px-1.5 py-0.5">relative overflow-hidden</code> container.
		</p>
		<div class="relative h-64 overflow-hidden rounded-xl border">
			<FluidCursorAdvanced
				fluidColors={["#6366f1", "#ec4899", "#06b6d4"]}
				colorIntensity={0.5}
				backColor={{ r: 0.04, g: 0.04, b: 0.08 }}
			/>
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<p class="text-muted-foreground text-sm">Move your cursor here</p>
			</div>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<pre class="bg-muted overflow-x-auto rounded p-4 text-sm"><code
					>{"<"}script{">"}
  import {"{"} FluidCursor, FluidCursorAdvanced {"}"} from '$lib/fancy-ui/fluid-cursor';
{"<"}/script{">"}

{"<!-- Full-screen background effect -->"}
{"<"}FluidCursor fluidColor="#00ffcc" colorIntensity={"{"}0.4{"}"} /{">\n"}
{"<!-- Contained inside a div -->"}
{"<"}div class="relative h-64 overflow-hidden rounded-xl"{">"}
  {"<"}FluidCursorAdvanced fluidColors={"{"}{`["#6366f1", "#ec4899"]`}{"}"} /{">"}{"\n"}
{"<"}/div{">"}</code
				></pre>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Props</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Both <code class="bg-muted rounded px-1.5 py-0.5">FluidCursor</code> and
			<code class="bg-muted rounded px-1.5 py-0.5">FluidCursorAdvanced</code> share the same props.
		</p>
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

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Notes</h2>
		<div class="bg-card rounded-lg border p-6">
			<ul class="text-muted-foreground list-inside list-disc space-y-2 text-sm">
				<li>The component uses WebGL2 with fallback to WebGL1</li>
				<li>Click to create a color splat effect</li>
				<li>Move your mouse to create flowing fluid trails</li>
				<li>Touch events are supported for mobile devices</li>
				<li>The canvas automatically resizes with the window</li>
			</ul>
		</div>
	</section>
</div>
