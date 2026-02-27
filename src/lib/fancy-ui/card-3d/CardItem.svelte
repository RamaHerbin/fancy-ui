<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils";

	interface Props {
		as?: string;
		class?: string;
		translateX?: number | string;
		translateY?: number | string;
		translateZ?: number | string;
		rotateX?: number | string;
		rotateY?: number | string;
		rotateZ?: number | string;
		children?: import("svelte").Snippet;
	}

	let {
		as = "div",
		class: className = "",
		translateX = 0,
		translateY = 0,
		translateZ = 0,
		rotateX = 0,
		rotateY = 0,
		rotateZ = 0,
		children,
	}: Props = $props();

	let ref: HTMLElement;

	const getMouseEntered = getContext<() => boolean>("card3d:mouseEntered");

	let transform = $derived(
		getMouseEntered()
			? `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
			: `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`
	);
</script>

<svelte:element
	this={as}
	bind:this={ref}
	class={cn("w-fit transition duration-500 ease-in-out", className)}
	style="transform: {transform}"
>
	{#if children}
		{@render children()}
	{/if}
</svelte:element>
