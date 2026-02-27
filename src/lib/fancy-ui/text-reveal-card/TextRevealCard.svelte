<script lang="ts">
	import { cn } from "$lib/utils";
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

	function mouseMoveHandler(event: MouseEvent) {
		event.preventDefault();
		if (cardRef) {
			const rect = cardRef.getBoundingClientRect();
			const relativeX = event.clientX - rect.left;
			widthPercentage = (relativeX / rect.width) * 100;
		}
	}

	function mouseLeaveHandler() {
		isMouseOver = false;
		setTimeout(() => {
			if (!isMouseOver) {
				widthPercentage = 0;
			}
		}, 100);
	}

	function mouseEnterHandler() {
		isMouseOver = true;
	}

	function touchMoveHandler(event: TouchEvent) {
		event.preventDefault();
		if (cardRef) {
			const rect = cardRef.getBoundingClientRect();
			const relativeX = event.touches[0]!.clientX - rect.left;
			widthPercentage = (relativeX / rect.width) * 100;
		}
	}
</script>

<div
	bind:this={cardRef}
	class={cn(
		"relative w-full max-w-[40rem] overflow-hidden rounded-lg border border-white/[0.08] bg-[#1d1c20] p-4 sm:p-6 md:p-8",
		className
	)}
	role="presentation"
	onmouseenter={mouseEnterHandler}
	onmouseleave={mouseLeaveHandler}
	onmousemove={mouseMoveHandler}
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
				widthPercentage}% 0 0); transition: {isMouseOver ? 'none' : 'all 0.4s ease-out'};"
			class="absolute z-20 bg-[#1d1c20] will-change-transform"
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
				: 0}; transition: {isMouseOver ? 'none' : 'all 0.4s ease-out'};"
			class="absolute z-50 h-40 w-[8px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent will-change-transform"
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
