<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { PartState } from "../types.js";
	export interface BadgeProps {
		variant?: "default" | "solid" | "blue" | "red" | "yellow" | "green" | "purple";
		/** Force a visual state for the /skins state matrix. */
		demoState?: PartState;
		class?: string;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { useSkin } from "../context.js";

	let { variant = "default", demoState, class: className, children }: BadgeProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.badge({ variant, state: demoState }));
</script>

<span class={cn(parts.root, className)}>{@render children?.()}</span>
