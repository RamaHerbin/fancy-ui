<script lang="ts">
	import { Timeline } from "$lib/fancy-ui/timeline";

	const items = [
		{ id: "step-3", label: "Step 3" },
		{ id: "step-2", label: "Step 2" },
		{ id: "step-1", label: "Step 1" },
	];
</script>

<Timeline {items} title="Project Timeline" description="Key milestones and updates.">
	{#snippet content(item)}
		<div class="space-y-4">
			<h3 class="text-foreground text-lg font-semibold md:hidden">{item.label}</h3>
			<div class="bg-card rounded-lg border p-4">
				<h4 class="mb-2 font-semibold">{item.label}</h4>
				<p class="text-muted-foreground text-sm">
					Content for {item.label}. The timeline shows scroll-driven progress.
				</p>
			</div>
		</div>
	{/snippet}
</Timeline>
