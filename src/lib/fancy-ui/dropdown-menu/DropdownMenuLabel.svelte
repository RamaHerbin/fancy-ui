<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface DropdownMenuLabelProps {
		/** The label's text. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { children, class: className }: DropdownMenuLabelProps = $props();
</script>

<!--
	A group heading, not a menuitem: never registered with the menu-focus
	core, never focusable, skipped entirely by arrow-key navigation and
	typeahead. Real text content (not `aria-hidden`), so it still reads to
	assistive tech as part of the menu — the same non-interactive-but-audible
	treatment `DropdownMenuItem`'s own label gets, just without a role.
-->
<div
	class={cn(
		"ft-dropdown-menu-label text-muted-foreground px-[8px] py-[4px] text-[10px] font-semibold tracking-[0.08em] uppercase opacity-60",
		className
	)}
>
	{@render children?.()}
</div>
