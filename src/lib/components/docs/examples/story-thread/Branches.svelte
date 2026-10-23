<script lang="ts">
	import { StoryNode, StoryThread } from "$lib/fancy-ui/story-thread";

	const segments = [
		{ nodes: ["intro", "school", "split"] },
		{ nodes: ["split", "branch-a", "join"], color: "oklch(0.82 0.08 240)" },
		{ nodes: ["split", "branch-b", "join"], color: "oklch(0.9 0.16 120)" },
	];
</script>

<div class="h-[440px] w-full overflow-y-auto rounded-xl border bg-zinc-950 text-zinc-100">
	<StoryThread layout="horizontal" {segments} ariaLabel="A story that forks">
		<section class="relative h-full w-[440px] shrink-0 p-10">
			<p class="font-mono text-xs text-zinc-400">( 01 ) Introduction</p>
			<h3 class="mt-2 text-2xl font-semibold">Follow the thread</h3>
			<StoryNode id="intro" class="absolute top-[64%] right-16" />
		</section>
		<section class="relative h-full w-[440px] shrink-0 p-10">
			<p class="font-mono text-xs text-zinc-400">( 02 ) School</p>
			<h3 class="mt-2 text-2xl font-semibold">Learning by making</h3>
			<StoryNode id="school" class="absolute top-[34%] right-24" />
		</section>
		<section class="relative h-full w-[560px] shrink-0 p-10">
			<p class="font-mono text-xs text-zinc-400">( 03 ) The path splits</p>
			<StoryNode id="split" variant="ring" class="absolute top-[52%] left-8" />
			<div class="absolute top-[8%] right-10 w-56">
				<p class="font-mono text-xs text-[oklch(0.82_0.08_240)]">Branch A</p>
				<p class="mt-1 text-sm text-zinc-300">Engineering at scale.</p>
			</div>
			<StoryNode id="branch-a" class="absolute top-[16%] right-72" />
			<div class="absolute right-10 bottom-[8%] w-56">
				<p class="font-mono text-xs text-[oklch(0.9_0.16_120)]">Branch B</p>
				<p class="mt-1 text-sm text-zinc-300">An open-source library.</p>
			</div>
			<StoryNode id="branch-b" class="absolute top-[86%] right-72" />
		</section>
		<section class="relative h-full w-[440px] shrink-0 p-10">
			<StoryNode id="join" variant="ring" class="absolute top-[52%] left-28" />
			<div class="absolute top-[44%] left-40">
				<p class="font-mono text-xs text-zinc-400">( 04 ) Next</p>
				<h3 class="mt-1 text-2xl font-semibold">Both roads meet</h3>
			</div>
		</section>
	</StoryThread>
</div>
