<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLInputAttributes } from "svelte/elements";
	import type { PartState } from "../types.js";
	export interface CheckboxProps extends Omit<HTMLInputAttributes, "class" | "type"> {
		checked?: boolean;
		error?: boolean;
		demoState?: PartState;
		class?: string;
		children?: Snippet;
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { useSkin } from "../context.js";

	let {
		checked = $bindable(false),
		error = false,
		demoState,
		class: className,
		children,
		ref = $bindable(null),
		...rest
	}: CheckboxProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.checkbox({ state: demoState }));
</script>

<label class={cn(parts.root, className)}>
	<input
		type="checkbox"
		class="peer sr-only"
		bind:this={ref}
		bind:checked
		aria-invalid={error}
		{...rest}
	/>
	<span class={parts.box}>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" aria-hidden="true">
			<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</span>
	{#if children}{@render children()}{/if}
</label>
