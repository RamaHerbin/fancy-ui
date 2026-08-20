<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface RetroButtonProps {
		/** Renders an <a> when set, a <button type="button"> otherwise. */
		href?: string;
		/** Open in a new tab (adds rel="noopener noreferrer"). */
		external?: boolean;
		/** "primary" = the gold --r-btn key, "outline" = a paper key. */
		variant?: "primary" | "outline";
		/** "sm" = 10px key on a 2px shadow; "md" = 12px key on a 3px shadow. */
		size?: "sm" | "md";
		/** Append the 2×2 color mark. */
		pixelGlyph?: boolean;
		/** Additional CSS classes. */
		class?: string;
		children: Snippet;
		/** aria-* / onclick / data-* … forwarded verbatim to the element. */
		[key: string]: unknown;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import PixelGlyph from "./PixelGlyph.svelte";

	let {
		href,
		external = false,
		variant = "outline",
		size = "md",
		pixelGlyph = false,
		class: className,
		children,
		...rest
	}: RetroButtonProps = $props();

	// Layout + size in Tailwind, color in a var: the kit's house rule. The
	// shadow rung is part of the size because it is part of the key's scale —
	// a 10px label on a 4px shadow reads as a mis-sized button, not a variant.
	const classes = $derived(
		cn(
			"r-border r-pixel r-pressable inline-flex items-center justify-center gap-[10px] text-center",
			size === "sm"
				? "r-shadow-2 px-[12px] py-[7px] text-[10px]"
				: "r-shadow-3 px-[22px] py-[10px] text-[12px]",
			className
		)
	);

	// `color` is set explicitly rather than inherited: many pages give plain
	// <a> a link color, which is wrong on a key — the label is ink on the key's
	// own surface, and the surface is what carries the accent.
	const styles = $derived(
		`background: ${variant === "primary" ? "var(--r-btn)" : "var(--r-paper)"}; color: var(--r-ink);`
	);
</script>

{#if href}
	<a
		{href}
		target={external ? "_blank" : undefined}
		rel={external ? "noopener noreferrer" : undefined}
		class={classes}
		style={styles}
		{...rest}
	>
		{@render children()}
		{#if pixelGlyph}<PixelGlyph />{/if}
	</a>
{:else}
	<button type="button" class={classes} style={styles} {...rest}>
		{@render children()}
		{#if pixelGlyph}<PixelGlyph />{/if}
	</button>
{/if}
