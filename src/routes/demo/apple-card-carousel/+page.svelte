<script lang="ts">
	import { AppleCardCarousel } from "$lib/fancy-ui/apple-card-carousel";
	import type { AppleCardData } from "$lib/fancy-ui/apple-card-carousel";

	const cards: AppleCardData[] = [
		{
			category: "Nature",
			title: "Misty Mountains",
			src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=60",
			description:
				"A breathtaking view of misty mountains at dawn, where layers of fog weave between ancient peaks. The gentle interplay of light and shadow creates a landscape that feels both timeless and dreamlike.",
		},
		{
			category: "Architecture",
			title: "Brutalist Forms",
			src: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&auto=format&fit=crop&q=60",
			description:
				"Raw concrete and bold geometry define this brutalist landmark. Every angle is deliberate, every surface a statement — architecture stripped of ornament and reduced to pure, honest form.",
		},
		{
			category: "Ocean",
			title: "Deep Blue",
			src: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop&q=60",
			description:
				"Beneath the surface, an entire world exists in silence. The ocean holds ancient secrets in its depths — creatures of light, corridors of coral, and the steady hum of currents that have shaped continents.",
		},
		{
			category: "Urban",
			title: "City Lights",
			src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&auto=format&fit=crop&q=60",
			description:
				"The city never sleeps. From dusk to dawn, millions of lives intersect across glowing grids of steel and glass. Each light in a window is a story — ambition, rest, love, or loss.",
		},
		{
			category: "Desert",
			title: "Sand & Silence",
			src: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&auto=format&fit=crop&q=60",
			description:
				"The desert teaches patience. Endless dunes shift imperceptibly under a relentless sun, sculpted by winds that have carved canyons over millennia. Here, time moves at a different scale.",
		},
	];
</script>

<svelte:head>
	<title>AppleCardCarousel — FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="mb-10">
		<h1 class="text-3xl font-bold tracking-tight">Apple Card Carousel</h1>
		<p class="text-muted-foreground mt-2">
			Horizontal card carousel with spring-animated full-screen expansion, inspired by Apple's App
			Store UI.
		</p>
	</div>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Click any card to expand it. Press <kbd
				class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">Esc</kbd
			> or click the backdrop to dismiss.
		</p>
		<div class="bg-card overflow-hidden rounded-lg border py-8">
			<AppleCardCarousel {cards} />
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
						<td class="text-primary px-4 py-3 font-mono">cards</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">AppleCardData[]</td>
						<td class="text-muted-foreground px-4 py-3">required</td>
						<td class="text-muted-foreground px-4 py-3">Array of card data objects</td>
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

	<!-- AppleCardData type -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">AppleCardData Type</h2>
		<div class="overflow-x-auto rounded-lg border">
			<table class="w-full text-sm">
				<thead class="bg-muted/50">
					<tr>
						<th class="px-4 py-3 text-left font-medium">Field</th>
						<th class="px-4 py-3 text-left font-medium">Type</th>
						<th class="px-4 py-3 text-left font-medium">Description</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					<tr>
						<td class="text-primary px-4 py-3 font-mono">category</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3">Label shown above the title</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">title</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3">Main card title</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">src</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3">URL of the card background image</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">description</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3">Optional text shown in the expanded view</td
						>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">content</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">Snippet</td>
						<td class="text-muted-foreground px-4 py-3"
							>Optional rich content snippet for the expanded view (takes precedence over
							description)</td
						>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</div>
