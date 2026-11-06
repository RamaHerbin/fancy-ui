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
	let pointerInside = $state(false);
	let focusInside = $state(false);
	const isMouseEntered = $derived(pointerInside || focusInside);

	setContext("card3d:mouseEntered", () => isMouseEntered);

	// Touch pointers never tilt: only a mouse or pen steers the card.
	const steers = (e: PointerEvent) => e.pointerType !== "touch";

	function handlePointerMove(e: PointerEvent) {
		if (!containerRef || !steers(e)) return;
		const { left, top, width, height } = containerRef.getBoundingClientRect();
		const x = (e.clientX - left - width / 2) / 25;
		const y = (e.clientY - top - height / 2) / 25;
		containerRef.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
	}

	function handlePointerEnter(e: PointerEvent) {
		if (!steers(e)) return;
		pointerInside = true;
	}

	function handlePointerLeave(e: PointerEvent) {
		if (!containerRef || !steers(e)) return;
		pointerInside = false;
		containerRef.style.transform = `rotateY(0deg) rotateX(0deg)`;
	}

	// Keyboard focus presents the card: its layers lift, the tilt stays neutral.
	function handleFocusIn(e: FocusEvent) {
		const target = e.target as Element | null;
		let visible = true;
		try {
			visible = !!target?.matches(":focus-visible");
		} catch {
			/* selector unsupported: treat as visible */
		}
		if (!visible) return;
		focusInside = true;
		if (containerRef) containerRef.style.transform = `rotateY(0deg) rotateX(0deg)`;
	}

	function handleFocusOut(e: FocusEvent) {
		if (containerRef?.contains(e.relatedTarget as Node | null)) return;
		focusInside = false;
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
		onpointerenter={handlePointerEnter}
		onpointermove={handlePointerMove}
		onpointerleave={handlePointerLeave}
		onfocusin={handleFocusIn}
		onfocusout={handleFocusOut}
	>
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
