<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface RetroTagProps {
		/** Pill fill, normally the owning card's tint (e.g. "var(--r-tint-blue)"). */
		bg?: string;
		/** Additional CSS classes. */
		class?: string;
		children: Snippet;
		/** data-* / aria-* … forwarded verbatim. */
		[key: string]: unknown;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { bg = "var(--r-paper)", class: className, children, ...rest }: RetroTagProps = $props();
</script>

<!--
	The tech-stack pill. Mono, because it labels a tool rather than speaking to
	the reader; the tint is inherited from the card so a row of tags reads as
	belonging to it rather than as six separate objects.
-->
<span
	class={cn(
		"r-border r-mono inline-flex items-center px-[8px] py-[2px] text-[10.5px] font-semibold",
		className
	)}
	style="background: {bg}; color: var(--r-ink);"
	{...rest}
>
	{@render children()}
</span>
