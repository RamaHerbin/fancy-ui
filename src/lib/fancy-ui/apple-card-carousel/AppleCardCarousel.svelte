<script lang="ts" module>
	import type { AppleCardData } from "./AppleCard.svelte";
	export type { AppleCardData };

	export interface AppleCardCarouselProps {
		/** Cards to display in the carousel */
		cards: AppleCardData[];
		/** Additional CSS classes */
		class?: string;
		/**
		 * Plays the matching open/close cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";
	import AppleCard from "./AppleCard.svelte";

	let { cards, class: className = "", sound = false }: AppleCardCarouselProps = $props();

	let expandedIndex = $state(-1);
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
</script>

<div class={cn("relative w-full", className)}>
	<div
		class="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
	>
		{#each cards as card, i}
			<AppleCard
				{card}
				index={i}
				{expandedIndex}
				{reducedMotion}
				onExpand={(idx) => (expandedIndex = idx)}
				onCollapse={() => (expandedIndex = -1)}
				{sound}
			/>
		{/each}
	</div>
</div>
