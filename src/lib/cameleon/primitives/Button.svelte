<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	export interface ButtonProps extends Omit<HTMLButtonAttributes, "class"> {
		variant?: "primary" | "secondary" | "destructive";
		size?: "sm" | "md" | "lg";
		loading?: boolean;
		/** Force a visual state for the /skins state matrix (non-interactive). */
		demoState?: "hover" | "active" | "focus";
		class?: string;
		children?: Snippet;
		ref?: HTMLButtonElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { useSkin } from "../context.js";
	import type { RecipeArgs } from "../types.js";

	let {
		variant = "primary",
		size = "md",
		loading = false,
		disabled = false,
		type = "button",
		demoState,
		class: className,
		children,
		ref = $bindable(null),
		...rest
	}: ButtonProps = $props();

	const ctx = useSkin();
	const args = $derived<RecipeArgs>({
		variant,
		size,
		state: demoState ?? (loading ? "loading" : disabled ? "disabled" : "default"),
	});
	// Re-runs whenever the active skin changes → live art-direction swap.
	const parts = $derived(ctx.skin.recipes.button(args));
	const trailing = $derived(ctx.skin.ornaments?.buttonTrailing);
</script>

<button
	bind:this={ref}
	{type}
	class={cn("cam-btn", parts.root, className)}
	disabled={disabled || loading}
	data-variant={variant}
	{...rest}
>
	{#if parts.label !== undefined}
		<span class={parts.label}>{@render children?.()}</span>
	{:else}
		{@render children?.()}
	{/if}
	{#if trailing}{@render trailing(args)}{/if}
</button>
