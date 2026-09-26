<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { ScrollProgress } from "$lib/fancy-ui/scroll-progress";

	let { values }: { values: PlaygroundValues } = $props();
	$effect(() => void values);

	let target = $state<HTMLElement | null>(null);
</script>

<div class="flex h-full w-full flex-col justify-center gap-2 p-6">
	<ScrollProgress {target} position="inline" class="text-primary rounded-full" />
	<div
		bind:this={target}
		class="border-border bg-card scrollbar-hide h-40 overflow-y-auto rounded-lg border p-3 text-xs leading-relaxed"
	>
		<p class="text-muted-foreground mb-2">
			A progress bar only earns its place when it answers something position alone can't: how much
			is left.
		</p>
		<p class="text-muted-foreground mb-2">
			This one tracks a single element, not the page, so scrolling anywhere else on the site leaves
			it untouched.
		</p>
		<p class="text-muted-foreground mb-2">
			The fill is a transform, not a width, so it stays on the compositor no matter how fast you
			scroll.
		</p>
		<p class="text-muted-foreground">Keep scrolling to watch it settle at the end.</p>
	</div>
</div>

<style>
	.scrollbar-hide {
		scrollbar-width: none;
	}

	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
