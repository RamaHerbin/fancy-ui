<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { attachHdrLight } from "../_internals/hdr/hdr-light.js";
	import { createCardSpotlightProbe } from "./card-spotlight-hdr.js";

	interface Props {
		class?: string;
		slotClass?: string;
		gradientSize?: number;
		gradientColor?: string;
		gradientOpacity?: number;
		/**
		 * On a display that reports HDR, add a hot core to the spotlight in a
		 * WebGPU layer with extended tone mapping, brighter than SDR white.
		 * Elsewhere nothing changes.
		 */
		hdr?: boolean;
		children?: import("svelte").Snippet;
	}

	let {
		class: className = "",
		slotClass = "",
		gradientSize = 200,
		gradientColor = "#262626",
		gradientOpacity = 0.8,
		hdr = true,
		children,
	}: Props = $props();

	// Hidden-spotlight offset seeds the pointer position; pointer events own it afterwards.
	// svelte-ignore state_referenced_locally
	let mouseX = $state(-gradientSize * 10);
	// Hidden-spotlight offset seeds the pointer position; pointer events own it afterwards.
	// svelte-ignore state_referenced_locally
	let mouseY = $state(-gradientSize * 10);

	function handleMouseMove(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		hovering = true;
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;
	}

	let hovering = false;
	let host: HTMLDivElement | undefined = $state();
	let hdrCanvas: HTMLCanvasElement | undefined = $state();

	function handleMouseLeave() {
		hovering = false;
		mouseX = -gradientSize * 10;
		mouseY = -gradientSize * 10;
	}

	$effect(() => {
		if (!host || !hdrCanvas) return;
		return attachHdrLight({
			host,
			canvas: hdrCanvas,
			pad: 0,
			probe: createCardSpotlightProbe(() => ({
				x: mouseX,
				y: mouseY,
				hovering,
				size: gradientSize,
				color: gradientColor,
				opacity: gradientOpacity,
			})),
		});
	});

	let backgroundStyle = $derived(
		`radial-gradient(circle at ${mouseX}px ${mouseY}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`
	);
</script>

<!-- Pointer-only spotlight effect; the content stays fully usable without it. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->

<div
	bind:this={host}
	class={cn(
		"group relative flex size-full overflow-hidden rounded-xl border bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white",
		className
	)}
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
>
	<div class={cn("relative z-10", slotClass)}>
		{#if children}
			{@render children()}
		{/if}
	</div>
	<div
		class="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-300"
		style="background: {backgroundStyle}; opacity: {gradientOpacity}"
	></div>
	{#if hdr}
		<!-- Light above SDR white, on HDR displays only. -->
		<canvas
			bind:this={hdrCanvas}
			class="pointer-events-none absolute inset-0 h-full w-full"
			aria-hidden="true"
		></canvas>
	{/if}
</div>
