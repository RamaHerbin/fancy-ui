<script lang="ts">
	import { FluidCursorAdvanced } from "$lib/fancy-ui/fluid-cursor";

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

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<pre class="bg-muted overflow-x-auto rounded p-4 text-sm"><code
					>{"<"}script{">"}
  import {"{"} FluidCursorAdvanced {"}"} from '$lib/fancy-ui/fluid-cursor';
{"<"}/script{">"}

{"<!-- Parent must be relative + overflow-hidden -->"}
{"<"}div class="relative h-64 overflow-hidden rounded-xl"{">"}
  {"<"}FluidCursorAdvanced
    fluidColors={"{"}{`["#6366f1", "#ec4899", "#06b6d4"]`}{"}"}
    colorIntensity={"{"}0.5{"}"}
    backColor={"{"}{`{ r: 0.04, g: 0.04, b: 0.08 }`}{"}"}
  /{">"}{"\n"}
{"<"}/div{">"}</code
				></pre>
		</div>
	</section>

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
				</tbody>
			</table>
		</div>
	</section>
</div>
