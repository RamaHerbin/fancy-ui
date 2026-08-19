<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { PartState } from "../types.js";
	export interface TooltipProps {
		/** Text shown in the bubble on hover / keyboard focus. */
		content: string;
		/** Force a visual state (focus / error) for the /skins state matrix. */
		demoState?: PartState;
		/** Force the bubble visible (state matrix). */
		demoOpen?: boolean;
		class?: string;
		/** Trigger contents; defaults to a "?" glyph. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { useSkin } from "../context.js";

	let { content, demoState, demoOpen = false, class: className, children }: TooltipProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.tooltip({ state: demoState }));
</script>

<span class={cn(parts.root, className)}>
	<button type="button" class={parts.trigger} aria-label={content}>
		{#if children}{@render children()}{:else}?{/if}
	</button>
	<span role="tooltip" class={cn(parts.bubble, demoOpen && "opacity-100")}>{content}</span>
</span>
