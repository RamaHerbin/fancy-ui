<script lang="ts" module>
	export interface InlineIndexLabelProps {
		/** e.g. "01" — the ordinal, owned by the layout. */
		index: string;
		/** The label text, e.g. "THE BRIEF". */
		label: string;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { index, label, class: className }: InlineIndexLabelProps = $props();
</script>

<!--
	`( 01 ) THE BRIEF` — the column header used where a block has no titlebar
	of its own to number it, so the index moves inline into the body.
-->
<div
	class={cn("r-mono text-[11px] font-bold tracking-[1px]", className)}
	style="color: var(--r-muted);"
>
	( {index} )&nbsp;<span>{label}</span>
</div>
