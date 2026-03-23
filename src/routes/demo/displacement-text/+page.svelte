<script lang="ts">
	import { DisplacementText } from "$lib/fancy-ui/displacement-text";
</script>

<svelte:head>
	<title>DisplacementText — FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="mb-10">
		<h1 class="text-3xl font-bold tracking-tight">3D Displacement Text</h1>
		<p class="text-muted-foreground mt-2">
			WebGL text with fluid 3D displacement that follows your cursor. Built with Three.js shaders.
		</p>
	</div>

	<!-- Default -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Default</h2>
		<div class="bg-card rounded-lg border">
			<DisplacementText text="Hover Me" fontSize={220} />
		</div>
	</section>

	<!-- Custom color -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Color</h2>
		<div class="bg-card rounded-lg border">
			<DisplacementText text="FancyUI" fontSize={200} color="#6366f1" />
		</div>
	</section>

	<!-- Theme aware -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Theme Aware</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Automatically switches color between light and dark mode.
		</p>
		<div class="bg-card rounded-lg border">
			<DisplacementText text="Adaptive" lightColor="#1a1a1a" darkColor="#f5f5f5" />
		</div>
	</section>

	<!-- Props -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Props</h2>
		<div class="overflow-x-auto rounded-lg border">
			<table class="w-full text-sm">
				<thead class="bg-muted/50">
					<tr>
						<th class="px-4 py-3 text-left font-medium">Prop</th>
						<th class="px-4 py-3 text-left font-medium">Type</th>
						<th class="px-4 py-3 text-left font-medium">Default</th>
						<th class="px-4 py-3 text-left font-medium">Description</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					<tr>
						<td class="text-primary px-4 py-3 font-mono">text</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">"Hover Me"</td>
						<td class="text-muted-foreground px-4 py-3">Text to display</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">fontSize</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">number</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">200</td>
						<td class="text-muted-foreground px-4 py-3">Font size in pixels</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">font</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">"Inter, sans-serif"</td>
						<td class="text-muted-foreground px-4 py-3">Font family</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">color</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">undefined</td>
						<td class="text-muted-foreground px-4 py-3">Fixed color (overrides theme colors)</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">lightColor</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">"#000000"</td>
						<td class="text-muted-foreground px-4 py-3">Color in light mode</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">darkColor</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">"#ffffff"</td>
						<td class="text-muted-foreground px-4 py-3">Color in dark mode</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">class</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">undefined</td>
						<td class="text-muted-foreground px-4 py-3">Additional CSS classes</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</div>
