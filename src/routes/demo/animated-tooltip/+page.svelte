<script lang="ts">
	import { AnimatedTooltip, type TooltipItem } from "$lib/fancy-ui/animated-tooltip";

	const people: TooltipItem[] = [
		{
			id: 1,
			name: "John Doe",
			designation: "Software Engineer",
			image: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop",
		},
		{
			id: 2,
			name: "Jane Smith",
			designation: "Product Manager",
			image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
		},
		{
			id: 3,
			name: "Robert Johnson",
			designation: "UX Designer",
			image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
		},
		{
			id: 4,
			name: "Emily Brown",
			designation: "Data Scientist",
			image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
		},
	];

	const teamMembers: TooltipItem[] = [
		{
			id: "a",
			name: "Alex Chen",
			designation: "CEO & Founder",
			image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
		},
		{
			id: "b",
			name: "Sarah Wilson",
			designation: "CTO",
			image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
		},
		{
			id: "c",
			name: "Michael Lee",
			designation: "Lead Developer",
			image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
		},
	];
</script>

<svelte:head>
	<title>AnimatedTooltip - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">AnimatedTooltip</h1>
	<p class="text-muted-foreground mb-8">
		A row of avatar images with animated tooltips that follow mouse movement. Hover over the avatars
		to see the tooltip animation.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<AnimatedTooltip items={people} />
		</div>
	</section>

	<!-- Team Members Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Team Members</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use it to display team members, contributors, or any group of people.
		</p>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<AnimatedTooltip items={teamMembers} />
		</div>
	</section>

	<!-- With Dark Background -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">On Dark Background</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			The tooltip stands out on dark backgrounds with its gradient accents.
		</p>
		<div class="flex justify-center rounded-lg border bg-zinc-900 p-8">
			<AnimatedTooltip items={people} />
		</div>
	</section>

	<!-- Usage Notes -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Props</h2>
		<div class="bg-card rounded-lg border p-6">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b">
						<th class="pb-2 text-left font-semibold">Prop</th>
						<th class="pb-2 text-left font-semibold">Type</th>
						<th class="pb-2 text-left font-semibold">Description</th>
					</tr>
				</thead>
				<tbody>
					<tr class="border-b">
						<td class="py-2"><code class="bg-muted rounded px-1.5 py-0.5">items</code></td>
						<td class="py-2"><code class="bg-muted rounded px-1.5 py-0.5">TooltipItem[]</code></td>
						<td class="py-2">Array of items with id, name, designation, and image</td>
					</tr>
					<tr>
						<td class="py-2"><code class="bg-muted rounded px-1.5 py-0.5">class</code></td>
						<td class="py-2"><code class="bg-muted rounded px-1.5 py-0.5">string</code></td>
						<td class="py-2">Additional CSS classes for the container</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</div>
