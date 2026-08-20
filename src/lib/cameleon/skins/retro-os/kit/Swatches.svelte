<script lang="ts" module>
	export interface SwatchesProps {
		/** Give each square the press physics — visual only, this component never switches anything. */
		interactive?: boolean;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { interactive = false, class: className }: SwatchesProps = $props();

	const SWATCHES = ["var(--r-blue)", "var(--r-rust)", "var(--r-gold)", "var(--r-green)"];
</script>

<!--
	The palette, stated once: four squares, the whole accent set, no legend.
	Decorative — it is the design system introducing itself, not a control.

	`interactive` therefore adds hover physics and nothing else. A real skin
	switcher belongs to the consuming app; keeping the two separate is what
	stops a decorative row from growing click handlers.
-->
<span aria-hidden="true" class={cn("inline-flex gap-[8px]", className)}>
	{#each SWATCHES as color (color)}
		<span
			class={cn("r-border h-[14px] w-[14px]", interactive && "r-pressable")}
			style="background: {color};"
		></span>
	{/each}
</span>
