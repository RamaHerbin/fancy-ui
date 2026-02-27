<script lang="ts">
	import { FluidCursor } from "$lib/fancy-ui/fluid-cursor";
</script>

<svelte:head>
	<title>FluidCursor - FancyUI</title>
</svelte:head>

<FluidCursor />

<div class="relative z-10 container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">FluidCursor</h1>
	<p class="text-muted-foreground mb-8">
		A WebGL fluid simulation that follows your cursor. Move your mouse around to see the effect.
	</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<p class="text-muted-foreground mb-4 text-sm">
				The FluidCursor component renders a full-screen WebGL canvas that creates fluid effects
				following mouse movement. It's typically used as a background effect.
			</p>
			<pre class="bg-muted overflow-x-auto rounded p-4 text-sm"><code
					>{"<"}script{">"}
  import {"{"} FluidCursor {"}"} from '$lib/fancy-ui/fluid-cursor';
{"<"}/script{">"}

{"<"}FluidCursor /{">"}</code
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
					<tr>
						<td class="px-4 py-3 font-mono text-xs">transparent</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">true</td>
						<td class="px-4 py-3">Enable transparent background</td>
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
