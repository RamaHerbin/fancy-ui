<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";

	interface Props {
		class?: string;
		containerClass?: string;
		children?: import("svelte").Snippet;
	}

	let { class: className = "", containerClass = "", children }: Props = $props();

	let containerRef: HTMLDivElement;
	let isMouseEntered = $state(false);

	setContext("card3d:mouseEntered", () => isMouseEntered);

	function handleMouseMove(e: MouseEvent) {
		if (!containerRef) return;
		const { left, top, width, height } = containerRef.getBoundingClientRect();
		const x = (e.clientX - left - width / 2) / 25;
		const y = (e.clientY - top - height / 2) / 25;
		containerRef.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
	}

	function handleMouseEnter() {
		isMouseEntered = true;
	}

	function handleMouseLeave() {
		if (!containerRef) return;
		isMouseEntered = false;
		containerRef.style.transform = `rotateY(0deg) rotateX(0deg)`;
	}
</script>

<div class={cn("flex items-center justify-center p-2", containerClass)} style="perspective: 1000px">
	<!-- Pointer-only tilt effect; the content stays fully usable without it. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={containerRef}
		class={cn(
			"relative flex items-center justify-center ease-linear motion-safe:transition-all motion-safe:duration-200",
			className
		)}
		style="transform-style: preserve-3d"
		onmouseenter={handleMouseEnter}
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
	>
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
