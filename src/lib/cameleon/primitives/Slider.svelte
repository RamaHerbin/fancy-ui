<script lang="ts" module>
	import type { HTMLInputAttributes } from "svelte/elements";
	export interface SliderProps extends Omit<HTMLInputAttributes, "class" | "type"> {
		error?: boolean;
		class?: string;
		value?: number;
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { useSkin } from "../context.js";

	let {
		error = false,
		class: className,
		value = $bindable(50),
		ref = $bindable(null),
		...rest
	}: SliderProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.slider({ state: error ? "error" : undefined }));
</script>

<input
	type="range"
	bind:this={ref}
	bind:value
	class={cn(parts.root, className)}
	aria-invalid={error || undefined}
	{...rest}
/>
