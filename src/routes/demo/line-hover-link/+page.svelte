<script lang="ts">
	import { LineHoverLink } from "$lib/fancy-ui/line-hover-link";
	import type { LineHoverVariant } from "$lib/fancy-ui/line-hover-link";

	const variants: { variant: LineHoverVariant; label: string }[] = [
		{ variant: "slide", label: "Slide" },
		{ variant: "double", label: "Double" },
		{ variant: "grow", label: "Grow" },
		{ variant: "strike", label: "Strike" },
		{ variant: "fade", label: "Fade" },
		{ variant: "pulse", label: "Pulse" },
		{ variant: "swap", label: "Swap" },
		{ variant: "sweep", label: "Sweep" },
		{ variant: "bounce", label: "Bounce" },
		{ variant: "arc", label: "Arc" },
		{ variant: "scribble", label: "Scribble" },
	];
</script>

<svelte:head>
	<title>LineHoverLink — FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="mb-10">
		<h1 class="text-3xl font-bold tracking-tight">Line Hover Link</h1>
		<p class="text-muted-foreground mt-2">
			Link component with 11 animated underline hover effects. Pure CSS — no JS on hover.
		</p>
	</div>

	<!-- All variants -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">All Variants</h2>
		<div class="bg-card flex min-h-[280px] items-center justify-center rounded-lg border p-12">
			<div class="grid grid-cols-3 gap-x-16 gap-y-10 md:grid-cols-4">
				{#each variants as { variant, label }}
					<div class="text-center">
						<LineHoverLink {variant} href="#" class="text-lg font-medium">
							{label}
						</LineHoverLink>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Navigation example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Navigation Example</h2>
		<div class="bg-card flex min-h-[120px] items-center justify-center rounded-lg border">
			<nav class="flex gap-8">
				<LineHoverLink variant="slide" href="#" class="text-muted-foreground">Home</LineHoverLink>
				<LineHoverLink variant="slide" href="#" class="text-muted-foreground">About</LineHoverLink>
				<LineHoverLink variant="slide" href="#" class="text-muted-foreground"
					>Services</LineHoverLink
				>
				<LineHoverLink variant="slide" href="#" class="text-muted-foreground">Contact</LineHoverLink
				>
			</nav>
		</div>
	</section>

	<!-- SVG variants -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">SVG Variants</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Arc and Scribble draw an SVG stroke on hover using <code
				class="bg-muted rounded px-1 font-mono text-xs">stroke-dashoffset</code
			>.
		</p>
		<div class="bg-card flex min-h-[120px] items-center justify-center gap-16 rounded-lg border">
			<LineHoverLink variant="arc" href="#" class="text-xl font-medium">Sign up</LineHoverLink>
			<LineHoverLink variant="scribble" href="#" class="text-xl font-medium">Writings</LineHoverLink
			>
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
						<td class="text-primary px-4 py-3 font-mono">variant</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">LineHoverVariant</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">"slide"</td>
						<td class="text-muted-foreground px-4 py-3">Animation variant</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">href</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">"#"</td>
						<td class="text-muted-foreground px-4 py-3">Link destination</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">target</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">undefined</td>
						<td class="text-muted-foreground px-4 py-3">Link target (e.g. "_blank")</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">rel</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">undefined</td>
						<td class="text-muted-foreground px-4 py-3">Link rel attribute</td>
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
