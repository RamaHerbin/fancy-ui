<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface AppleCardData {
		/** Category label shown above the title */
		category: string;
		/** Main card title */
		title: string;
		/** URL of the card background image */
		src: string;
		/** Short description shown in the expanded view */
		description?: string;
		/** Rich content shown in the expanded view (takes precedence over description) */
		content?: Snippet;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";

	interface Props {
		card: AppleCardData;
		index: number;
		expandedIndex: number;
		onExpand: (index: number) => void;
		onCollapse: () => void;
		class?: string;
	}

	let { card, index, expandedIndex, onExpand, onCollapse, class: className = "" }: Props = $props();

	let cardEl: HTMLDivElement;
	let rect = $state<{ top: number; left: number; width: number; height: number } | null>(null);
	let overlayVisible = $state(false);
	let fullyExpanded = $state(false);
	let reducedMotion = $state(false);

	onMount(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotion = mq.matches;
		const handler = (e: MediaQueryListEvent) => {
			reducedMotion = e.matches;
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	});

	function handleExpand() {
		if (expandedIndex !== -1) return;
		const r = cardEl.getBoundingClientRect();
		rect = { top: r.top, left: r.left, width: r.width, height: r.height };
		overlayVisible = true;
		onExpand(index);

		if (reducedMotion) {
			fullyExpanded = true;
		} else {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					fullyExpanded = true;
				});
			});
		}
	}

	function handleCollapse() {
		fullyExpanded = false;
		const delay = reducedMotion ? 0 : 400;
		setTimeout(() => {
			overlayVisible = false;
			onCollapse();
			rect = null;
		}, delay);
	}

	function handleCardKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleExpand();
		}
	}

	function handleOverlayKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") handleCollapse();
	}
</script>

<!-- Collapsed card in the carousel -->
<div
	bind:this={cardEl}
	class={cn(
		"relative h-80 w-56 shrink-0 cursor-pointer snap-start overflow-hidden rounded-3xl md:h-96 md:w-72",
		className
	)}
	role="button"
	tabindex="0"
	aria-label="Open {card.title}"
	onclick={handleExpand}
	onkeydown={handleCardKeydown}
>
	<img
		src={card.src}
		alt={card.title}
		class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
		draggable="false"
	/>
	<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
	<div class="absolute bottom-0 left-0 p-5">
		<p class="mb-1 text-xs font-semibold tracking-widest text-white/70 uppercase">
			{card.category}
		</p>
		<h3 class="text-base font-semibold text-white md:text-lg">{card.title}</h3>
	</div>
</div>

<!-- Expanded overlay -->
{#if overlayVisible && rect !== null}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-40 bg-black/80"
		aria-hidden="true"
		style="opacity: {fullyExpanded ? 1 : 0}; transition: opacity {reducedMotion ? 0 : 400}ms ease;"
		onclick={handleCollapse}
	></div>

	<div
		role="dialog"
		aria-modal="true"
		aria-label={card.title}
		tabindex="-1"
		class="fixed z-50 overflow-y-auto bg-white dark:bg-neutral-900"
		style="
			top: {fullyExpanded ? '0px' : rect.top + 'px'};
			left: {fullyExpanded ? '0px' : rect.left + 'px'};
			width: {fullyExpanded ? '100vw' : rect.width + 'px'};
			height: {fullyExpanded ? '100vh' : rect.height + 'px'};
			border-radius: {fullyExpanded ? '0px' : '1.5rem'};
			transition: {reducedMotion
			? 'none'
			: 'top 0.4s cubic-bezier(0.32,0.72,0,1), left 0.4s cubic-bezier(0.32,0.72,0,1), width 0.4s cubic-bezier(0.32,0.72,0,1), height 0.4s cubic-bezier(0.32,0.72,0,1), border-radius 0.4s cubic-bezier(0.32,0.72,0,1)'};
		"
		onkeydown={handleOverlayKeydown}
	>
		<!-- Close button -->
		<button
			class="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-colors hover:bg-black/30"
			aria-label="Close"
			onclick={handleCollapse}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="white"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
		</button>

		<!-- Hero image -->
		<div class="relative h-72 w-full shrink-0 md:h-96">
			<img src={card.src} alt={card.title} class="h-full w-full object-cover" draggable="false" />
			<div
				class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
			></div>
			<div class="absolute bottom-0 left-0 p-6 md:p-8">
				<p class="mb-2 text-xs font-semibold tracking-widest text-white/70 uppercase">
					{card.category}
				</p>
				<h2 class="text-2xl font-bold text-white md:text-3xl">{card.title}</h2>
			</div>
		</div>

		<!-- Content area -->
		<div class="p-6 md:p-8">
			{#if card.content}
				{@render card.content()}
			{:else if card.description}
				<p class="leading-relaxed text-gray-600 dark:text-neutral-400">{card.description}</p>
			{/if}
		</div>
	</div>
{/if}
