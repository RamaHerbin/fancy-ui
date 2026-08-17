<!--
	An anchor wearing the active skin's button recipe.

	The cameleon `Button` primitive renders a real <button> with no anchor mode,
	but every call-to-action on the landing page is a navigation. Rather than
	widen the primitive's API for one page, this borrows the same recipe so a
	CTA restyles with the skin exactly like a Button does — and stays an <a>.
-->
<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAnchorAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";
	import { useSkin } from "$lib/cameleon";

	interface Props extends Omit<HTMLAnchorAttributes, "class"> {
		href: string;
		variant?: "primary" | "secondary" | "destructive";
		size?: "sm" | "md" | "lg";
		class?: string;
		children?: Snippet;
	}

	let {
		href,
		variant = "primary",
		size = "md",
		class: className,
		children,
		...rest
	}: Props = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.button({ variant, size }));
</script>

<a {href} class={cn("cam-btn", parts.root, className)} data-variant={variant} {...rest}>
	{#if parts.label !== undefined}
		<span class={parts.label}>{@render children?.()}</span>
	{:else}
		{@render children?.()}
	{/if}
</a>
