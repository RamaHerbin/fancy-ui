<script lang="ts" module>
	import type { HTMLButtonAttributes } from "svelte/elements";
	import type { PartState } from "../types.js";
	export interface SwitchProps extends Omit<HTMLButtonAttributes, "class" | "onclick"> {
		checked?: boolean;
		error?: boolean;
		demoState?: PartState;
		class?: string;
		ref?: HTMLButtonElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { useSkin } from "../context.js";

	let {
		checked = $bindable(false),
		error = false,
		disabled = false,
		demoState,
		class: className,
		ref = $bindable(null),
		...rest
	}: SwitchProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.switch({ state: demoState }));
</script>

<button
	bind:this={ref}
	type="button"
	role="switch"
	aria-checked={checked}
	aria-invalid={error}
	{disabled}
	onclick={() => (checked = !checked)}
	class={cn(parts.root, className)}
	{...rest}
>
	<span class={parts.thumb}></span>
</button>
