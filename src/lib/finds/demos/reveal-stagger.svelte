<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { Reveal } from "$lib/fancy-ui/reveal";
	import type { RevealProps } from "$lib/fancy-ui/reveal";

	let { values }: { values: PlaygroundValues } = $props();

	let replayCount = $state(0);

	const cards = ["Fast", "Themeable", "Tested"];
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
	<button
		type="button"
		onclick={() => replayCount++}
		class="bg-card border-border text-foreground hover:bg-muted rounded-full border px-4 py-1.5 text-sm transition-colors"
	>
		Replay
	</button>

	{#key replayCount}
		<Reveal
			trigger="mount"
			preset={values.preset as RevealProps["preset"]}
			stagger={values.stagger as number}
			distance={values.distance as number}
			class="flex gap-3"
		>
			{#each cards as card (card)}
				<div
					class="bg-card border-border flex h-16 w-16 items-center justify-center rounded-lg border"
				>
					<span class="text-foreground text-xs font-medium">{card}</span>
				</div>
			{/each}
		</Reveal>
	{/key}
</div>
