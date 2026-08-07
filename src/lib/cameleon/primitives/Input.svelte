<script lang="ts" module>
	import type { HTMLInputAttributes } from "svelte/elements";
	import type { PartState } from "../types.js";
	export interface InputProps extends Omit<HTMLInputAttributes, "class"> {
		error?: boolean;
		/** Force a visual state for the /skins state matrix. */
		demoState?: PartState;
		class?: string;
		value?: string;
		ref?: HTMLInputElement | null;
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
		ref = $bindable(null),
		...rest
	}: InputProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.input({ state: demoState }));
</script>

<input
	bind:this={ref}
	bind:value
	class={cn(parts.root, className)}
	aria-invalid={error}
	{...rest}
/>
