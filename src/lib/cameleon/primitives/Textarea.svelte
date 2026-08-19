<script lang="ts" module>
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import type { PartState } from "../types.js";
	export interface TextareaProps extends Omit<HTMLTextareaAttributes, "class"> {
		error?: boolean;
		demoState?: PartState;
		class?: string;
		value?: string;
		ref?: HTMLTextAreaElement | null;
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
	}: TextareaProps = $props();

	const ctx = useSkin();
	const parts = $derived(ctx.skin.recipes.textarea({ state: demoState }));
</script>

<textarea
	bind:this={ref}
	bind:value
	class={cn(parts.root, className)}
	aria-invalid={error}
	{...rest}
></textarea>
