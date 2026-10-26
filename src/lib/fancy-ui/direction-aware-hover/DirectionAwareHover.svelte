<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";
	import { fade } from "svelte/transition";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	type Direction = "top" | "bottom" | "left" | "right";

	interface Props {
		imageUrl: string;
		imageAlt?: string;
		childrenClass?: string;
		imageClass?: string;
		class?: string;
		children?: import("svelte").Snippet;
	}

	let {
		imageUrl,
		imageAlt = "image",
		childrenClass: childrenClassProp = "",
		imageClass: imageClassProp = "",
		class: className = "",
		children,
	}: Props = $props();

	let divRef: HTMLDivElement;
	// JS-timed fades collapse to 0 under reduced motion (the CSS side is motion-safe gated).
	const reducedMotion = createReducedMotion();
	$effect(() => reducedMotion.start());
	let direction = $state<Direction | null>(null);
	let isTouched = $state(false);
	let isMobile = $state(false);
	let touchTimer: ReturnType<typeof setTimeout> | null = null;

	function detectMobile() {
		isMobile = window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window;
	}

	function getDirection(
		ev: MouseEvent | { clientX: number; clientY: number },
		obj: HTMLElement
	): number {
		const { width: w, height: h, left, top } = obj.getBoundingClientRect();
		const x = ev.clientX - left - (w / 2) * (w > h ? h / w : 1);
		const y = ev.clientY - top - (h / 2) * (h > w ? w / h : 1);
		const d = Math.round(Math.atan2(y, x) / 1.57079633 + 5) % 4;
		return d;
	}

	function mapDirection(d: number): Direction {
		switch (d) {
			case 0:
				return "top";
			case 1:
				return "right";
			case 2:
				return "bottom";
			case 3:
				return "left";
			default:
				return "left";
		}
	}

	// Keyboard path: focus shows the fully presented state (overlay in from the top,
	// image shifted, caption mounted). Nothing is announced: the caption is already in the DOM.
	let focusPresented = false;

	function handleFocusIn() {
		// A click focuses the root too, while the pointer already chose a direction: keep it.
		if (direction !== null) return;
		focusPresented = true;
		direction = "top";
	}

	function handleFocusOut(event: FocusEvent) {
		if (event.relatedTarget instanceof Node && divRef?.contains(event.relatedTarget)) return;
		if (!focusPresented) return;
		focusPresented = false;
		direction = null;
	}

	function handlePointerEnter(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		if (isMobile) return;
		if (!divRef) return;

		const fetchedDirection = getDirection(event, divRef);
		direction = mapDirection(fetchedDirection);
	}

	function handlePointerLeave(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		if (isMobile) return;
		direction = focusPresented ? "top" : null;
	}

	function handleTouchStart(event: TouchEvent) {
		if (!isMobile) return;

		isTouched = true;

		if (!divRef) return;
		const touch = event.touches[0];
		const fetchedDirection = getDirection(
			{ clientX: touch.clientX, clientY: touch.clientY },
			divRef
		);
		direction = mapDirection(fetchedDirection);

		// Auto-hide after 3 seconds on mobile
		if (touchTimer) clearTimeout(touchTimer);
		touchTimer = setTimeout(() => {
			handleTouchEnd();
		}, 3000);
	}

	function handleTouchEnd() {
		if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}

		setTimeout(() => {
			direction = null;
			isTouched = false;
		}, 300);
	}

	let containerClass = $derived(
		cn(
			"group/card relative overflow-hidden rounded-lg bg-transparent motion-safe:transition-all motion-safe:duration-300",
			"h-48 w-48",
			"sm:h-64 sm:w-64",
			"md:h-80 md:w-80",
			"lg:h-96 lg:w-96",
			"xl:h-[28rem] xl:w-[28rem]",
			"touch-manipulation",
			"active:scale-[0.98]",
			"md:active:scale-100",
			className
		)
	);

	let imageClass = $derived(
		cn(
			"h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300",
			"scale-125",
			"sm:scale-[1.35]",
			"md:scale-150",
			imageClassProp
		)
	);

	let childrenClass = $derived(
		cn(
			"absolute z-40 text-white motion-safe:transition-opacity motion-safe:duration-300",
			"bottom-2 left-2 text-sm",
			"sm:bottom-3 sm:left-3 sm:text-base",
			"md:bottom-4 md:left-4 md:text-lg",
			childrenClassProp
		)
	);

	let overlayClass = $derived.by(() => {
		const baseClasses = "absolute inset-0 z-10 motion-safe:transition-all motion-safe:duration-300";
		const backgroundClasses = "bg-black/40 dark:bg-black/60";

		let transformClasses = "";
		switch (direction) {
			case "top":
				transformClasses =
					"-translate-y-full group-hover/card:translate-y-0 group-focus-within/card:translate-y-0";
				break;
			case "bottom":
				transformClasses =
					"translate-y-full group-hover/card:translate-y-0 group-focus-within/card:translate-y-0";
				break;
			case "left":
				transformClasses =
					"-translate-x-full group-hover/card:translate-x-0 group-focus-within/card:translate-x-0";
				break;
			case "right":
				transformClasses =
					"translate-x-full group-hover/card:translate-x-0 group-focus-within/card:translate-x-0";
				break;
			default:
				transformClasses = "";
		}

		return cn(baseClasses, backgroundClasses, transformClasses);
	});

	let imageContainerClass = $derived(
		cn("relative size-full bg-gray-50 motion-safe:transition-transform motion-safe:duration-300 dark:bg-black", {
			"translate-y-2 md:translate-y-5": direction === "top",
			"-translate-y-2 md:-translate-y-5": direction === "bottom",
			"translate-x-2 md:translate-x-5": direction === "left",
			"-translate-x-2 md:-translate-x-5": direction === "right",
		})
	);

	onMount(() => {
		detectMobile();
		window.addEventListener("resize", detectMobile);

		return () => {
			window.removeEventListener("resize", detectMobile);
			if (touchTimer) {
				clearTimeout(touchTimer);
			}
		};
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={divRef}
	class={containerClass}
	tabindex="0"
	onpointerenter={handlePointerEnter}
	onpointerleave={handlePointerLeave}
	onfocusin={handleFocusIn}
	onfocusout={handleFocusOut}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	role="figure"
>
	<div class="relative size-full overflow-hidden">
		{#if direction !== null}
			<div class={overlayClass} transition:fade={{ duration: reducedMotion.current ? 0 : 300 }}></div>
		{/if}

		<div class={imageContainerClass}>
			<img src={imageUrl} alt={imageAlt} class={imageClass} width="1000" height="1000" />
		</div>

		{#if direction !== null || isTouched}
			<div class={childrenClass} transition:fade={{ duration: reducedMotion.current ? 0 : 300 }}>
				{#if children}
					{@render children()}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Enhanced mobile touch targets */
	@media (max-width: 768px) {
		:global(.group\/card) {
			min-height: 44px;
			min-width: 44px;
		}
	}

</style>
