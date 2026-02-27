<script lang="ts">
	import { getContext } from "svelte";
	import { DOCK_CONTEXT_KEY, type DockContext } from "./types";

	interface Props {
		class?: string;
		children?: import("svelte").Snippet;
	}

	let { class: className = "", children }: Props = $props();

	const context = getContext<DockContext>(DOCK_CONTEXT_KEY);

	let iconRef: HTMLDivElement | undefined = $state();

	function calculateDistance(): number {
		if (!iconRef) return Infinity;

		const bounds = iconRef.getBoundingClientRect();

		if (context.orientation === "vertical") {
			return context.mouseY.current - bounds.y - bounds.height / 2;
		}

		return context.mouseX.current - bounds.x - bounds.width / 2;
	}

	let iconWidth = $derived.by(() => {
		const distanceCalc = calculateDistance();

		if (!context.distance || !context.magnification) return 40;

		if (Math.abs(distanceCalc) < context.distance) {
			return (1 - Math.abs(distanceCalc) / context.distance) * context.magnification + 40;
		}

		return 40;
	});
</script>

<div
	bind:this={iconRef}
	class="flex aspect-square cursor-pointer items-center justify-center rounded-full transition-all duration-200 ease-out {className}"
	style:width="{iconWidth}px"
	style:height="{iconWidth}px"
>
	{#if children}
		{@render children()}
	{/if}
</div>
