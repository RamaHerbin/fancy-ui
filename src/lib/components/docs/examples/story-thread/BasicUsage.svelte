<script lang="ts">
	import { StoryNode, StoryThread } from "$lib/fancy-ui/story-thread";

	const chapters = [
		{
			id: "start",
			n: "01",
			title: "Where it starts",
			text: "Scroll down: the page moves sideways and the thread follows.",
			top: "80%",
		},
		{
			id: "craft",
			n: "02",
			title: "Learning the craft",
			text: "Each node lights up as the thread reaches it.",
			top: "56%",
		},
		{
			id: "ship",
			n: "03",
			title: "Shipping it",
			text: "Wheel sideways, drag, or use the arrow keys.",
			top: "86%",
		},
		{
			id: "next",
			n: "04",
			title: "What comes next",
			text: "The end of the thread, so far.",
			top: "62%",
		},
	];
</script>

<div class="bg-background text-foreground h-[420px] w-full overflow-y-auto rounded-xl border">
	<StoryThread layout="horizontal" ariaLabel="A short story">
		{#each chapters as chapter (chapter.id)}
			<section class="relative h-full w-[520px] shrink-0 px-10 py-12">
				<p class="text-muted-foreground font-mono text-xs">( {chapter.n} )</p>
				<h3 class="mt-2 text-2xl font-semibold tracking-tight">{chapter.title}</h3>
				<p class="text-muted-foreground mt-2 max-w-[18rem] text-sm">{chapter.text}</p>
				<StoryNode id={chapter.id} class="absolute right-24" style="top: {chapter.top}" />
			</section>
		{/each}
	</StoryThread>
</div>
