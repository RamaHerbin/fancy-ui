<script lang="ts">
	import { AnimatedTooltip, type TooltipItem } from "$lib/fancy-ui/animated-tooltip";

	const people: TooltipItem[] = [
		{
			id: 1,
			name: "John Doe",
			designation: "Software Engineer",
			image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
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
</script>

<div class="flex w-full justify-center p-6">
	<div
		class="w-full max-w-md rounded-[20px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
	>
		<div
			class="flex flex-col items-center gap-5 rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-6 pt-20 pb-7 [--at-separator:#fafafa] dark:border-white/[0.06] dark:bg-[#141416] dark:[--at-separator:#141416]"
		>
			<AnimatedTooltip items={people} />
			<p class="flex items-center gap-2 text-xs text-black/50 dark:text-white/45">
				<span class="size-1.5 rounded-full bg-emerald-500/80" aria-hidden="true"></span>
				4 people in this file
			</p>
		</div>
	</div>
</div>
