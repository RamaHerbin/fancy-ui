<script lang="ts" module>
	export interface NumChipProps {
		/** The index itself, e.g. "01" — an ordinal the layout owns, never content. */
		label: string;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { label, class: className }: NumChipProps = $props();
</script>

<!--
	Inverted ink chip carrying a card's ordinal. No border: ink on ink would
	draw nothing, and the chip is already its own silhouette.
-->
<span
	class={cn("r-pixel inline-flex items-center px-[7px] py-[2px] text-[10px]", className)}
	style="background: var(--r-ink); color: var(--r-paper);"
>
	{label}
</span>
