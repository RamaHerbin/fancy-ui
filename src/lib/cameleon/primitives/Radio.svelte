<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLInputAttributes } from "svelte/elements";
	import type { PartState } from "../types.js";
	export interface RadioProps extends Omit<HTMLInputAttributes, "class" | "type"> {
		group?: string;
		value?: string;
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
		group = $bindable(),
		value,
		name,
		error = false,
		demoState,
		class: className,
		children,
		ref = $bindable(null),
		...rest
	}: RadioProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.radio({ state: demoState }));
</script>

<label class={cn(parts.root, className)}>
	<!-- radio invalidity belongs on the group, not the input; drive the demo
	     error visual off a data-attribute so we don't misuse aria-invalid.
	     name defaults to the group so same-group radios stay mutually exclusive
	     natively even when the parent doesn't share a bound group variable. -->
	<input
		type="radio"
		class="peer sr-only"
		bind:this={ref}
		bind:group
		name={name ?? group}
		{value}
		data-invalid={error ? "true" : undefined}
		{...rest}
	/>
	<span class={parts.box}></span>
	{#if children}{@render children()}{/if}
</label>
