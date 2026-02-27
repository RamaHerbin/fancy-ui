<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		rotate?: "x" | "y";
		class?: string;
		children?: Snippet;
		back?: Snippet;
	}

	let { rotate = "y", class: className = "", children, back }: Props = $props();

	const rotationClass = {
		x: ["group-hover:[transform:rotateX(180deg)]", "[transform:rotateX(180deg)]"],
		y: ["group-hover:[transform:rotateY(180deg)]", "[transform:rotateY(180deg)]"],
	} as const;

	let rotation = $derived(rotationClass[rotate]);
</script>

<div class={cn("group h-72 w-56 [perspective:1000px]", className)}>
	<div
		class={cn(
			"relative h-full rounded-2xl transition-all duration-500 [transform-style:preserve-3d]",
			rotation[0]
		)}
	>
		<!-- Front -->
		<div class="absolute size-full overflow-hidden rounded-2xl border [backface-visibility:hidden]">
			{#if children}
				{@render children()}
			{/if}
		</div>

		<!-- Back -->
		<div
			class={cn(
				"absolute h-full w-full overflow-hidden rounded-2xl border bg-black/80 p-4 text-slate-200 [backface-visibility:hidden]",
				rotation[1]
			)}
		>
			{#if back}
				{@render back()}
			{/if}
		</div>
	</div>
</div>
