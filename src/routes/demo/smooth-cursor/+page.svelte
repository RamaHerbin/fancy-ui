<script lang="ts">
	import { SmoothCursor } from '$lib/fancy-ui/smooth-cursor';
</script>

<svelte:head>
	<title>SmoothCursor - FancyUI</title>
</svelte:head>

<SmoothCursor />

<div class="container relative z-10 mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">SmoothCursor</h1>
	<p class="mb-8 text-muted-foreground">
		A physics-based smooth cursor that follows your mouse with spring animations and rotation
		effects. Move your mouse around to see the effect.
	</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<p class="mb-4 text-sm text-muted-foreground">
				The SmoothCursor component renders a custom cursor that follows the mouse with spring
				physics. Simply add the component to your page.
			</p>
			<pre
				class="overflow-x-auto rounded bg-muted p-4 text-sm"><code>{'<'}script{'>'}
  import {'{'} SmoothCursor {'}'} from '$lib/fancy-ui/smooth-cursor';
{'<'}/script{'>'}

{'<'}SmoothCursor /{'>'}</code></pre>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Spring Config</h2>
		<div class="rounded-lg border bg-card p-6">
			<p class="mb-4 text-sm text-muted-foreground">
				Customize the spring physics to achieve different cursor behaviors.
			</p>
			<pre
				class="overflow-x-auto rounded bg-muted p-4 text-sm"><code>{'<'}SmoothCursor
  springConfig={'{'}{'{'} damping: 20, stiffness: 200, mass: 0.5 {'}'}{'}'} /{'>'}</code></pre>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Cursor</h2>
		<div class="rounded-lg border bg-card p-6">
			<p class="mb-4 text-sm text-muted-foreground">
				Replace the default arrow with a custom cursor using Svelte snippets.
			</p>
			<pre
				class="overflow-x-auto rounded bg-muted p-4 text-sm"><code>{'<'}SmoothCursor{'>'}
  {'{'}#snippet cursor(){'}'}
    {'<'}div class="h-4 w-4 rounded-full bg-primary" /{'>'}
  {'{'}/snippet{'}'}
{'<'}/SmoothCursor{'>'}</code></pre>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Props</h2>
		<div class="overflow-x-auto rounded-lg border bg-card">
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
						<td class="px-4 py-3 font-mono text-xs">cursor</td>
						<td class="px-4 py-3 font-mono text-xs">Snippet</td>
						<td class="px-4 py-3 font-mono text-xs">Arrow SVG</td>
						<td class="px-4 py-3">Custom cursor content</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">springConfig</td>
						<td class="px-4 py-3 font-mono text-xs">SpringConfig</td>
						<td class="px-4 py-3 font-mono text-xs">{'{}'}</td>
						<td class="px-4 py-3">Spring physics configuration</td>
					</tr>
					<tr>
						<td class="px-4 py-3 font-mono text-xs">class</td>
						<td class="px-4 py-3 font-mono text-xs">string</td>
						<td class="px-4 py-3 font-mono text-xs">''</td>
						<td class="px-4 py-3">Additional CSS classes</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">SpringConfig</h2>
		<div class="overflow-x-auto rounded-lg border bg-card">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b">
						<th class="px-4 py-3 text-left font-medium">Property</th>
						<th class="px-4 py-3 text-left font-medium">Type</th>
						<th class="px-4 py-3 text-left font-medium">Default</th>
						<th class="px-4 py-3 text-left font-medium">Description</th>
					</tr>
				</thead>
				<tbody>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">damping</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">45</td>
						<td class="px-4 py-3">How quickly the animation settles</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">stiffness</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">400</td>
						<td class="px-4 py-3">Controls the spring stiffness</td>
					</tr>
					<tr>
						<td class="px-4 py-3 font-mono text-xs">mass</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">1</td>
						<td class="px-4 py-3">Virtual mass of the animated object</td>
					</tr>
					</tbody>
			</table>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Notes</h2>
		<div class="rounded-lg border bg-card p-6">
			<ul class="list-inside list-disc space-y-2 text-sm text-muted-foreground">
				<li>The cursor auto-hides when the mouse leaves the viewport</li>
				<li>Rotation follows the direction of movement with smoothing</li>
				<li>
					Consider adding <code class="rounded bg-muted px-1">cursor: none</code> to your page to
					hide the default browser cursor
				</li>
				<li>The component uses <code class="rounded bg-muted px-1">will-change: transform</code> for GPU acceleration</li>
				<li>Fixed positioning at z-index 9999 ensures cursor is always on top</li>
			</ul>
		</div>
	</section>
</div>
