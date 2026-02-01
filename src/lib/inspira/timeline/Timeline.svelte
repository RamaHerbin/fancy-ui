<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export interface TimelineItem {
		id: string;
		label: string;
	}

	export interface TimelineProps {
		/** Timeline entries */
		items?: TimelineItem[];
		/** Heading text */
		title?: string;
		/** Subheading text */
		description?: string;
		/** Additional CSS classes for the outer wrapper */
		class?: string;
		/** Content snippet, called for each item */
		content?: Snippet<[TimelineItem]>;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { onMount } from 'svelte';

	let {
		items = [],
		title,
		description,
		class: className,
		content
	}: TimelineProps = $props();

	let timelineRef: HTMLDivElement;
	let timelineHeight = $state(0);
	let scrollProgress = $state(0);

	let progressHeight = $derived(scrollProgress * timelineHeight);
	let progressOpacity = $derived(Math.min(scrollProgress / 0.1, 1));

	function updateProgress() {
		if (!timelineRef) return;

		const rect = timelineRef.getBoundingClientRect();
		const viewportHeight = window.innerHeight;

		// Start tracking when top of timeline reaches 10% from top of viewport
		const startOffset = viewportHeight * 0.1;
		// End tracking when bottom of timeline reaches 50% of viewport
		const endOffset = viewportHeight * 0.5;

		const start = rect.top - startOffset;
		const end = rect.bottom - endOffset;
		const total = end - start;

		if (total <= 0) {
			scrollProgress = 0;
			return;
		}

		const progress = -start / total;
		scrollProgress = Math.max(0, Math.min(1, progress));
	}

	onMount(() => {
		if (timelineRef) {
			timelineHeight = timelineRef.getBoundingClientRect().height;
		}

		const resizeObserver = new ResizeObserver(() => {
			if (timelineRef) {
				timelineHeight = timelineRef.getBoundingClientRect().height;
			}
		});

		resizeObserver.observe(timelineRef);
		window.addEventListener('scroll', updateProgress, { passive: true });
		updateProgress();

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('scroll', updateProgress);
		};
	});
</script>

<div class={cn('w-full font-sans md:px-10', className)}>
	{#if title || description}
		<div class="mx-auto max-w-7xl px-4 py-20 md:px-8 lg:px-10">
			{#if title}
				<h2 class="mb-4 max-w-4xl text-lg text-foreground md:text-4xl">
					{title}
				</h2>
			{/if}
			{#if description}
				<p class="max-w-sm text-sm text-muted-foreground md:text-base">
					{description}
				</p>
			{/if}
		</div>
	{/if}

	<div bind:this={timelineRef} class="relative z-0 mx-auto max-w-7xl pb-20">
		{#each items as item, index (`${item.id}-${index}`)}
			<div class="flex justify-start pt-10 md:gap-10 md:pt-40">
				<!-- Sticky label -->
				<div
					class="sticky top-40 z-40 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm"
				>
					<div
						class="absolute left-3 flex size-10 items-center justify-center rounded-full bg-background md:left-3"
					>
						<div
							class="size-4 rounded-full border border-neutral-300 bg-neutral-200 p-2 dark:border-neutral-700 dark:bg-neutral-800"
						/>
					</div>
					<h3
						class="hidden text-xl font-bold text-neutral-500 md:block md:pl-20 md:text-5xl dark:text-neutral-500"
					>
						{item.label}
					</h3>
				</div>

				<!-- Item content -->
				<div class="w-full pl-20 pr-4 md:pl-4">
					{#if content}
						{@render content(item)}
					{/if}
				</div>
			</div>
		{/each}

		<!-- Background line -->
		<div
			style:height="{timelineHeight}px"
			class="absolute left-8 top-0 w-[2px] overflow-hidden bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-0% via-neutral-200 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] md:left-8 dark:via-neutral-700"
		>
			<!-- Animated progress line -->
			<div
				style:height="{progressHeight}px"
				style:opacity={progressOpacity}
				class="absolute inset-x-0 top-0 w-[2px] rounded-full bg-gradient-to-t from-purple-500 from-0% via-blue-500 via-10% to-transparent"
			></div>
		</div>
	</div>
</div>
