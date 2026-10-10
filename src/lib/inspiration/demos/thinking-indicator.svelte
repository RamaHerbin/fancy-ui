<script lang="ts">
	import { onMount } from "svelte";
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { ThinkingIndicator } from "$lib/fancy-ui/thinking-indicator";

	let { values }: { values: PlaygroundValues } = $props();

	// Read the clock after mount only: a server render and its hydration would disagree.
	let since = $state<number>();
	onMount(() => {
		since = Date.now() - 4_000;
	});
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<div class="bg-card w-full max-w-[300px] rounded-2xl border p-4">
		<p class="text-muted-foreground text-xs">Refactor the retry helper and run the suite.</p>
		<div class="mt-4">
			<ThinkingIndicator
				status={values.status as string}
				variant={values.variant as "inline" | "pill"}
				{since}
				class="text-sm"
			/>
		</div>
	</div>
</div>
