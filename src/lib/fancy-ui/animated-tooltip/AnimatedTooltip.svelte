<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface TooltipItem {
		id: number | string;
		name: string;
		designation: string;
		image: string;
	}

	export interface AnimatedTooltipProps {
		/** Array of items to display */
		items: TooltipItem[];
		/** Additional CSS classes for the container */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { scale } from "svelte/transition";

	let { items, class: className }: AnimatedTooltipProps = $props();

	let hoveredIndex = $state<number | string | null>(null);
	let mouseX = $state(0);

	// Calculate rotation and translation based on mouse position
	let rotation = $derived((mouseX / 100) * 50);
	let translation = $derived((mouseX / 100) * 50);

	function handleMouseEnter(event: MouseEvent, itemId: number | string) {
		// Reset mouseX first to prevent offset from previous item
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const halfWidth = rect.width / 2;
		mouseX = event.clientX - rect.left - halfWidth;
		hoveredIndex = itemId;
	}

	function handleMouseMove(event: MouseEvent) {
		if (hoveredIndex === null) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const halfWidth = rect.width / 2;
		mouseX = event.clientX - rect.left - halfWidth;
	}

	function handleMouseLeave() {
		hoveredIndex = null;
		mouseX = 0;
	}

	function handleFocusIn(itemId: number | string) {
		mouseX = 0;
		hoveredIndex = itemId;
	}

	function handleFocusOut() {
		hoveredIndex = null;
		mouseX = 0;
	}

	function tooltipId(itemId: number | string) {
		return `animated-tooltip-${itemId}`;
	}
</script>

<div class={cn("flex flex-row items-center", className)}>
	{#each items as item (item.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="group relative -mr-4"
			onmouseenter={(e) => handleMouseEnter(e, item.id)}
			onmouseleave={handleMouseLeave}
			onmousemove={handleMouseMove}
			onfocusin={() => handleFocusIn(item.id)}
			onfocusout={handleFocusOut}
			tabindex="0"
			aria-describedby={hoveredIndex === item.id ? tooltipId(item.id) : undefined}
		>
			<!-- Tooltip -->
			{#if hoveredIndex === item.id}
				<div
					id={tooltipId(item.id)}
					role="tooltip"
					class="pointer-events-none absolute -top-16 left-1/2 z-50 flex flex-col items-center justify-center rounded-md bg-black px-4 py-2 text-xs whitespace-nowrap shadow-xl"
					style="transform: translateX(calc(-50% + {translation}px)) rotate({rotation}deg);"
					transition:scale={{
						duration: 200,
						start: 0.6,
					}}
				>
					<!-- Gradient lines -->
					<div
						class="absolute right-1/2 -bottom-px z-30 me-1 h-px w-2/5 translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
					></div>
					<div
						class="absolute -bottom-px left-1/2 z-30 ms-1 h-px w-2/5 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-500 to-transparent"
					></div>

					<!-- Content -->
					<div class="relative z-30 text-base font-bold text-white">
						{item.name}
					</div>
					<div class="text-xs text-white">{item.designation}</div>
				</div>
			{/if}

			<!-- Avatar Image -->
			<img
				src={item.image}
				alt={item.name}
				class="relative !m-0 size-14 rounded-full border-2 border-white object-cover object-top !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105"
			/>
		</div>
	{/each}
</div>
