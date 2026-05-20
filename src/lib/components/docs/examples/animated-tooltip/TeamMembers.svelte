<script lang="ts">
	import { AnimatedTooltip, type TooltipItem } from "$lib/fancy-ui/animated-tooltip";

	const teamMembers: TooltipItem[] = [
		{ id: "a", name: "Alex Chen", designation: "CEO & Founder", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
		{ id: "b", name: "Sarah Wilson", designation: "CTO", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
		{ id: "c", name: "Michael Lee", designation: "Lead Developer", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
	];
</script>

<div class="flex justify-center p-6">
	<AnimatedTooltip items={teamMembers} />
</div>
