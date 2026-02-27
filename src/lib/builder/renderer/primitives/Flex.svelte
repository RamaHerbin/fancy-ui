<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		direction?: string;
		align?: string;
		justify?: string;
		gap?: string;
		wrap?: boolean;
		class?: string;
		children?: Snippet;
	}

	let {
		direction = "row",
		align = "center",
		justify = "start",
		gap = "gap-4",
		wrap = false,
		class: className = "",
		children,
	}: Props = $props();

	const directionMap: Record<string, string> = {
		row: "flex-row",
		column: "flex-col",
		"row-reverse": "flex-row-reverse",
		"column-reverse": "flex-col-reverse",
	};

	const alignMap: Record<string, string> = {
		start: "items-start",
		center: "items-center",
		end: "items-end",
		stretch: "items-stretch",
	};

	const justifyMap: Record<string, string> = {
		start: "justify-start",
		center: "justify-center",
		end: "justify-end",
		between: "justify-between",
		around: "justify-around",
	};

	let flexClasses = $derived(
		cn(
			"flex",
			directionMap[direction] ?? "flex-row",
			alignMap[align] ?? "items-center",
			justifyMap[justify] ?? "justify-start",
			gap,
			wrap && "flex-wrap",
			className
		)
	);
</script>

<div class={flexClasses}>
	{#if children}
		{@render children()}
	{/if}
</div>
