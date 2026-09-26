<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { TextRoll } from "$lib/fancy-ui/text-roll";

	let { values }: { values: PlaygroundValues } = $props();

	const PRICES = ["$50", "$40", "$65"];
	let index = $state(0);
	let price = $derived(PRICES[index]);

	function next() {
		index = (index + 1) % PRICES.length;
	}
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
	<p class="text-foreground flex items-baseline gap-1 text-4xl font-semibold">
		<TextRoll
			value={price}
			tabular
			duration={values.duration as number}
			stagger={values.stagger as number}
			direction={values.direction as "auto" | "up" | "down"}
		/>
		<span class="text-muted-foreground text-base font-normal">/mo</span>
	</p>
	<button
		type="button"
		onclick={next}
		class="border-border bg-card text-foreground hover:bg-muted rounded-full border px-4 py-1.5 text-sm transition-colors"
	>
		Next plan
	</button>
</div>
