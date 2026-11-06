<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface BlurRevealProps {
		/** Animation duration in seconds */
		duration?: number;
		/** Stagger delay between children in seconds */
		delay?: number;
		/** Initial blur amount (CSS value) */
		blur?: string;
		/** Initial vertical offset in pixels */
		yOffset?: number;
		/** Additional CSS classes for the container */
		class?: string;
		/** Reveal style: "blur" softens in with blur/translate, "hard" snaps opacity with no easing */
		mode?: "blur" | "hard";
		/** Content to reveal */
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";
	import { staggerCap, staggerDelay } from "../_internals/motion/stagger.js";

	let {
		duration = 1,
		delay = 0.2,
		blur = "20px",
		yOffset = 20,
		class: className,
		mode = "blur",
		children,
	}: BlurRevealProps = $props();

	let containerRef: HTMLDivElement;
	let wrapperRef = $state<HTMLDivElement>();
	let isInView = $state(false);

	// A stagger is N copies of one entrance offset in time: the parent writes
	// each child's delay (capped by item size) and re-indexes when the child
	// list changes.
	$effect(() => {
		if (!wrapperRef) return;
		const root: HTMLElement = wrapperRef;
		const stepMs = delay * 1000;

		function apply() {
			const kids = Array.from(root.children).filter(
				(el): el is HTMLElement | SVGElement =>
					el instanceof HTMLElement || el instanceof SVGElement
			);
			const cap = staggerCap(kids[0]?.getBoundingClientRect().height ?? 0);
			for (let i = 0; i < kids.length; i++) {
				const ms = staggerDelay(i, kids.length, stepMs, "first", cap);
				kids[i].style.setProperty("--ft-child-delay", `${ms}ms`);
			}
		}

		apply();
		const observer = new MutationObserver(apply);
		observer.observe(root, { childList: true });
		return () => {
			observer.disconnect();
			for (const el of Array.from(root.children)) {
				if (el instanceof HTMLElement || el instanceof SVGElement) {
					el.style.removeProperty("--ft-child-delay");
				}
			}
		};
	});

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						isInView = true;
						observer.disconnect();
					}
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(containerRef);

		return () => observer.disconnect();
	});
</script>

<div
	bind:this={containerRef}
	class={cn(className)}
	style:--blur-reveal-duration="{duration}s"
	style:--blur-reveal-blur={blur}
	style:--blur-reveal-y="{yOffset}px"
>
	{#if children}
		<div
			bind:this={wrapperRef}
			class="blur-reveal-wrapper"
			class:is-visible={isInView}
			class:mode-hard={mode === "hard"}
		>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.blur-reveal-wrapper > :global(*) {
		opacity: 0;
		filter: blur(var(--blur-reveal-blur, 20px));
		transform: translateY(var(--blur-reveal-y, 20px));
		/* off-token: prop-driven seconds */
		transition:
			opacity var(--blur-reveal-duration, 1s) ease-in-out,
			filter var(--blur-reveal-duration, 1s) ease-in-out,
			transform var(--blur-reveal-duration, 1s) ease-in-out;
	}

	.blur-reveal-wrapper.is-visible > :global(*) {
		opacity: 1;
		filter: blur(0px);
		transform: translateY(0);
	}

	/* Hard mode: no blur/translate softening, opacity snaps in via a stepped timing function */
	.blur-reveal-wrapper.mode-hard > :global(*) {
		opacity: 0;
		filter: none;
		transform: none;
		transition: opacity var(--blur-reveal-duration, 1s) steps(2, jump-none);
	}

	.blur-reveal-wrapper.mode-hard.is-visible > :global(*) {
		opacity: 1;
	}

	/* Per-child delay, written by the component (staggerDelay + staggerCap). Placed after
	   the hard-mode shorthand, which resets transition-delay. */
	.blur-reveal-wrapper.is-visible > :global(*) {
		transition-delay: var(--ft-child-delay, 0ms);
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.blur-reveal-wrapper > :global(*) {
			/* off-token: reduced-motion collapse */
			transition-duration: 0.1s !important;
			transition-delay: 0s !important;
		}
	}
</style>
