<script lang="ts">
	import { AnimatedTooltip, type TooltipItem } from "$lib/fancy-ui/animated-tooltip";

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

	const contributors: TooltipItem[] = [
		{
			id: "d",
			name: "Jane Smith",
			designation: "Product Manager",
			image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
		},
		{
			id: "e",
			name: "Robert Johnson",
			designation: "UX Designer",
			image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
		},
		{
			id: "f",
			name: "Emily Brown",
			designation: "Data Scientist",
			image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
		},
		{
			id: "g",
			name: "John Doe",
			designation: "Software Engineer",
			image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
		},
	];
</script>

<div class="flex flex-col items-center gap-12 p-6 pt-20">
	<div class="flex flex-col items-center gap-3">
		<AnimatedTooltip items={teamMembers} size={72} accent="#f0a36e" />
		<span class="text-[11px] tracking-wide text-black/45 uppercase dark:text-white/40">
			Leadership · size 72 · warm accent
		</span>
	</div>
	<div class="flex flex-col items-center gap-3 pt-12">
		<AnimatedTooltip items={contributors} size={40} accent="oklch(0.72 0.12 165)" />
		<span class="text-[11px] tracking-wide text-black/45 uppercase dark:text-white/40">
			Contributors · size 40 · green accent
		</span>
	</div>
</div>
