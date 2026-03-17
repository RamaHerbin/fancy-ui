<script lang="ts">
	import { AnimatedTestimonials } from "$lib/fancy-ui/animated-testimonials";
	import type { Testimonial } from "$lib/fancy-ui/animated-testimonials";

	const testimonials: Testimonial[] = [
		{
			quote:
				"The attention to detail and innovative features have completely transformed our workflow. This is exactly what we've been looking for.",
			name: "Sarah Chen",
			designation: "Product Manager at TechFlow",
			src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop&q=60",
		},
		{
			quote:
				"Implementation was seamless and the results exceeded our expectations. The platform's flexibility is truly impressive.",
			name: "Michael Rivera",
			designation: "CTO at InnovateSphere",
			src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&auto=format&fit=crop&q=60",
		},
		{
			quote:
				"This solution has significantly improved our team's productivity. The intuitive interface makes complex tasks simple.",
			name: "Emily Watson",
			designation: "Operations Director at CloudScale",
			src: "https://images.unsplash.com/photo-1623582854588-d60de57fa33f?w=500&auto=format&fit=crop&q=60",
		},
		{
			quote:
				"Outstanding support and robust features. It's rare to find a product that delivers on all its promises.",
			name: "James Kim",
			designation: "Engineering Lead at DataPro",
			src: "https://images.unsplash.com/photo-1636041293178-808a6762ab39?w=500&auto=format&fit=crop&q=60",
		},
		{
			quote:
				"The scalability and performance have been game-changing for our organization. Highly recommend to any growing business.",
			name: "Lisa Thompson",
			designation: "VP of Technology at FutureNet",
			src: "https://images.unsplash.com/photo-1624561172888-ac93c696e10c?w=500&auto=format&fit=crop&q=60",
		},
	];

	const autoplayTestimonials: Testimonial[] = testimonials.slice(0, 3);
</script>

<svelte:head>
	<title>AnimatedTestimonials - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="mb-10">
		<h1 class="text-3xl font-bold tracking-tight">Animated Testimonials</h1>
		<p class="text-muted-foreground mt-2">
			Testimonial carousel with smooth slide animations, navigation arrows, and optional autoplay.
		</p>
	</div>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex min-h-[400px] items-center justify-center rounded-lg border">
			<AnimatedTestimonials {testimonials} />
		</div>
	</section>

	<!-- With Autoplay -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">With Autoplay</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Auto-advances every 3 seconds. Pauses on hover.
		</p>
		<div class="bg-card flex min-h-[400px] items-center justify-center rounded-lg border">
			<AnimatedTestimonials testimonials={autoplayTestimonials} autoplay interval={3000} />
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
						<td class="text-primary px-4 py-3 font-mono">testimonials</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">Testimonial[]</td>
						<td class="text-muted-foreground px-4 py-3">required</td>
						<td class="text-muted-foreground px-4 py-3">Array of testimonial objects</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">autoplay</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">boolean</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">false</td>
						<td class="text-muted-foreground px-4 py-3">Auto-advance testimonials</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">interval</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">number</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">5000</td>
						<td class="text-muted-foreground px-4 py-3">Autoplay interval in milliseconds</td>
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

	<!-- Testimonial type -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Testimonial Type</h2>
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
						<td class="text-primary px-4 py-3 font-mono">quote</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3">The testimonial text</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">name</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3">Author's full name</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">designation</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3">Author's title or role</td>
					</tr>
					<tr>
						<td class="text-primary px-4 py-3 font-mono">src</td>
						<td class="text-muted-foreground px-4 py-3 font-mono">string</td>
						<td class="text-muted-foreground px-4 py-3">URL to the author's avatar image</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</div>
