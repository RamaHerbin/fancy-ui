<script lang="ts">
	import { StoryNode, StoryThread } from "$lib/fancy-ui/story-thread";

	const steps = [
		{ id: "2020", title: "First internship", side: "left" },
		{ id: "2021", title: "A museum archive", side: "right" },
		{ id: "2022", title: "A national library", side: "left" },
		{ id: "2023", title: "Design school", side: "right" },
		{ id: "2024", title: "A team of my own", side: "left" },
	];
</script>

<div class="bg-background text-foreground h-[420px] w-full overflow-y-auto rounded-xl border">
	<StoryThread layout="vertical" dash="dashed" ariaLabel="Timeline">
		<div class="py-48">
			{#each steps as step (step.id)}
				<div class="relative grid h-40 grid-cols-2 items-center gap-16 px-8">
					<StoryNode
						id={step.id}
						class="absolute top-1/2 -translate-y-1/2 {step.side === 'left'
							? 'left-[46%]'
							: 'left-[54%]'}"
					/>
					<div class={step.side === "left" ? "col-start-1 text-right" : "col-start-2"}>
						<p class="text-muted-foreground font-mono text-xs">{step.id}</p>
						<p class="text-lg font-medium">{step.title}</p>
					</div>
				</div>
			{/each}
		</div>
	</StoryThread>
</div>
