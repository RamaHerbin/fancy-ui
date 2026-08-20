<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface ChipProps {
		/** "outline" = paper on ink border · "ink" = inverted · "tint" = a pale accent wash. */
		tone?: "outline" | "ink" | "tint";
		/** The tint color when tone="tint", e.g. "var(--r-tint-blue)". */
		bg?: string;
		/** Dashed border — the "provisional / not-a-link" signal. */
		dashed?: boolean;
		/** Additional CSS classes. */
		class?: string;
		children: Snippet;
		/** data-* / aria-* … forwarded verbatim. */
		[key: string]: unknown;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { tone = "outline", bg, dashed = false, class: className, children, ...rest }: ChipProps =
		$props();

	// Deliberately font-agnostic. Chips appear in both typefaces across the
	// design (pixel for status-ish labels, mono for data-ish ones), and the
	// choice belongs to the section, not to the chip — pass `.r-pixel` or
	// `.r-mono` in `class`. Padding and size are Tailwind so cn()/twMerge lets
	// a caller replace them without an inline-style fight.
	const background = $derived(
		tone === "ink" ? "var(--r-ink)" : tone === "tint" ? (bg ?? "var(--r-tint-gold)") : "var(--r-paper)"
	);
</script>

<span
	class={cn("r-border inline-flex items-center px-[8px] py-[2px] text-[11px]", className)}
	style="background: {background}; color: {tone === 'ink'
		? 'var(--r-paper)'
		: 'var(--r-ink)'}; border-style: {dashed ? 'dashed' : 'solid'};"
	{...rest}
>
	{@render children()}
</span>
