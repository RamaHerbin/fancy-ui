<script lang="ts" module>
	/**
	 * BoxReveal - Sliding box reveal animation
	 *
	 * Content fades up while a colored box slides from left to right,
	 * revealing the content underneath. Triggers when entering viewport
	 * via IntersectionObserver.
	 */
	export interface BoxRevealProps {
		/** Color of the reveal box */
		color?: string;
		/** Animation duration in seconds */
		duration?: number;
		/** Delay before animation starts (seconds) */
		delay?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";

	let {
		color = "#5046e6",
		duration = 0.5,
		delay = 0.25,
		class: className,
		children,
	}: BoxRevealProps & { children: Snippet } = $props();

	let containerRef: HTMLDivElement;
	let isInView = $state(false);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					isInView = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(containerRef);

		return () => observer.disconnect();
	});
</script>

<div bind:this={containerRef} class={cn("box-reveal relative overflow-hidden", className)}>
	<!-- Content (fades up) -->
	<div
		class="box-reveal-content"
		style="opacity:{isInView ? 1 : 0};transform:translateY({isInView
			? 0
			: 25}px);transition:opacity {duration}s ease {delay * 2}s,transform {duration}s ease {delay *
			2}s"
	>
		{@render children()}
	</div>

	<!-- Sliding box overlay -->
	<div
		class="box-reveal-overlay absolute inset-0 z-20"
		style="background:{color};left:{isInView
			? '100%'
			: '0%'};transition:left {duration}s ease-in {delay}s"
	></div>
</div>
