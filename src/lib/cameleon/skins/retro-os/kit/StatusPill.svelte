<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface StatusPillProps {
		/** Fill — the pill's meaning IS its color (green = live, gold = in progress, …). */
		bg: string;
		/** Additional CSS classes. */
		class?: string;
		children: Snippet;
		/** data-* / aria-* … forwarded verbatim. */
		[key: string]: unknown;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { bg, class: className, children, ...rest }: StatusPillProps = $props();
</script>

<!--
	Smallest pixel label in the system (9px): a state stamped on a card. `bg`
	is required rather than defaulted because a status pill with no color is
	not a status pill, it is a tag.
-->
<span
	class={cn("r-border r-pixel inline-flex items-center px-[7px] py-[2px] text-[9px]", className)}
	style="background: {bg}; color: var(--r-ink);"
	{...rest}
>
	{@render children()}
</span>
