<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLSelectAttributes } from "svelte/elements";
	import type { PartState } from "../types.js";
	export interface SelectProps extends Omit<HTMLSelectAttributes, "class"> {
		error?: boolean;
		demoState?: PartState;
		class?: string;
		value?: string;
		children?: Snippet;
		ref?: HTMLSelectElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { useSkin } from "../context.js";

	let {
		error = false,
		demoState,
		class: className,
		value = $bindable(""),
		children,
		ref = $bindable(null),
		...rest
	}: SelectProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.select({ state: demoState }));
</script>

<div class={cn(parts.root, className)}>
	<select bind:this={ref} bind:value class={parts.field} aria-invalid={error} {...rest}>
		{@render children?.()}
	</select>
	<span class={parts.chevron} aria-hidden="true">
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
			<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</span>
</div>
