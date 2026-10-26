<script lang="ts">
	import { cn } from "$lib/utils.js";
	import TextRevealStars from "./TextRevealStars.svelte";
	import type { Snippet } from "svelte";
	import { onMount } from "svelte";

	interface Props {
		class?: string;
		starsCount?: number;
		starsClass?: string;
		children?: Snippet;
		text?: Snippet;
		revealText?: Snippet;
	}

	let {
		class: className = "",
		starsCount = 130,
		starsClass = "",
		children,
		text,
		revealText,
	}: Props = $props();

	let cardRef: HTMLDivElement;
	let widthPercentage = $state(0);
	let isMouseOver = $state(false);

	let rotateDeg = $derived((widthPercentage - 50) * 0.1);

	// Hover scrub is for a mouse or pen: a touch pointer is the touch handlers' job.
	function pointerMoveHandler(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		event.preventDefault();
		if (cardRef) {
			const rect = cardRef.getBoundingClientRect();
			const relativeX = event.clientX - rect.left;
			widthPercentage = (relativeX / rect.width) * 100;
		}
	}

	// Keyboard path: focus shows the fully revealed text (no partial scrub);
	// Escape or blur returns to rest. Nothing extra is announced: the text is in the DOM.
	let focusRevealed = false;

	function focusInHandler() {
		// A click focuses the card too, while the pointer already drives the scrub.
		if (isMouseOver) return;
		focusRevealed = true;
		widthPercentage = 100;
	}

	function focusOutHandler(event: FocusEvent) {
		if (event.relatedTarget instanceof Node && cardRef?.contains(event.relatedTarget)) return;
		if (!focusRevealed) return;
		focusRevealed = false;
		widthPercentage = 0;
	}

	function keyDownHandler(event: KeyboardEvent) {
		if (event.key !== "Escape" || !focusRevealed) return;
		focusRevealed = false;
		widthPercentage = 0;
	}

	function mouseLeaveHandler() {
		isMouseOver = false;
		setTimeout(() => {
			if (!isMouseOver) {
				widthPercentage = focusRevealed ? 100 : 0;
			}
		}, 100);
	}

	function mouseEnterHandler() {
		isMouseOver = true;
	}

	function pointerEnterHandler(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		mouseEnterHandler();
	}

	function pointerLeaveHandler(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		mouseLeaveHandler();
	}

	function touchMoveHandler(event: TouchEvent) {
		if (cardRef) {
			const rect = cardRef.getBoundingClientRect();
			const relativeX = event.touches[0]!.clientX - rect.left;
			widthPercentage = (relativeX / rect.width) * 100;
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={cardRef}
	class={cn(
		"relative w-full max-w-[40rem] touch-pan-y touch-pinch-zoom overflow-hidden rounded-lg border border-white/[0.08] bg-[#1d1c20] p-4 sm:p-6 md:p-8",
		className
	)}
	role="group"
	tabindex="0"
	onfocusin={focusInHandler}
	onfocusout={focusOutHandler}
	onkeydown={keyDownHandler}
	onpointerenter={pointerEnterHandler}
	onpointerleave={pointerLeaveHandler}
	onpointermove={pointerMoveHandler}
	ontouchstart={mouseEnterHandler}
	ontouchend={mouseLeaveHandler}
	ontouchmove={touchMoveHandler}
>
	{#if children}
		{@render children()}
	{/if}

	<div class="relative flex h-40 items-center overflow-hidden">
		<!-- Reveal layer -->
		<div
			style="width: 100%; opacity: {widthPercentage > 0 ? 1 : 0}; clip-path: inset(0 {100 -
				widthPercentage}% 0 0);"
			class="absolute z-20 bg-[#1d1c20] will-change-transform"
			class:text-reveal-settle={!isMouseOver}
		>
			{#if text}
				{@render text()}
			{/if}
		</div>

		<!-- Reveal line -->
		<div
			style="left: {widthPercentage}%; transform: rotate({rotateDeg}deg); opacity: {widthPercentage >
			0
				? 1
				: 0};"
			class="absolute z-50 h-40 w-[8px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent will-change-transform"
			class:text-reveal-settle={!isMouseOver}
		></div>

		<!-- Background text + stars -->
		<div
			class="overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,white,transparent)]"
		>
			{#if revealText}
				{@render revealText()}
			{/if}
			<TextRevealStars {starsCount} class={starsClass} />
		</div>
	</div>
</div>

<style>
	/* The 0.4s settle after the pointer leaves is travel (clip-path, left, rotate, opacity):
	   it only runs without a reduce preference, otherwise the reveal snaps back.
	   While hovering the class is off, so the layers follow the pointer without easing. */
	@media (prefers-reduced-motion: no-preference) {
		.text-reveal-settle {
			transition: all 0.4s ease-out;
		}
	}
</style>
