<script lang="ts">
	import { AnimatedTooltip, type TooltipItem } from "$lib/fancy-ui/animated-tooltip";

	const people: TooltipItem[] = [
		{ id: 1, name: "John Doe", designation: "Software Engineer", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
		{ id: 2, name: "Jane Smith", designation: "Product Manager", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
		{ id: 3, name: "Robert Johnson", designation: "UX Designer", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" },
		{ id: 4, name: "Emily Brown", designation: "Data Scientist", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop" },
	];
</script>

<div class="flex justify-center p-6">
	<AnimatedTooltip items={people} />
</div>
