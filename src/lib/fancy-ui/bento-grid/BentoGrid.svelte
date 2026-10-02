<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils";
	import { inView } from "../_internals/motion/in-view.js";
	import { staggerDelay } from "../_internals/motion/stagger.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	interface Props {
		class?: string;
		/** Tiles fade up in a stagger the first time the grid scrolls into view. */
		reveal?: boolean;
		/** Colour of the hover glow, the lit bottom edge, the icon ring and the CTA arrow. Any CSS colour; writes `--bento-accent`. */
		accent?: string;
		children?: Snippet;
	}

	let { class: className = "", reveal = true, accent, children }: Props = $props();

	/** ms per tile, and the total ceiling the stagger is compressed into. */
	const STEP = 70;
	const CAP = 420;

	let ref = $state<HTMLDivElement | null>(null);
	let shown = $state(false);

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	const revealing = $derived(reveal && !reduced.current);

	// Index every direct element child: `--bento-i` (its position) and
	// `--bento-delay` (its capped stagger delay). Re-indexed when the child
	// list changes, so an {#each} that grows stays in order.
	$effect(() => {
		if (!ref) return;
		const root = ref;
		function apply() {
			const kids = Array.from(root.children).filter(
				(el): el is HTMLElement => el instanceof HTMLElement
			);
			kids.forEach((el, i) => {
				el.style.setProperty("--bento-i", String(i));
				el.style.setProperty(
					"--bento-delay",
					`${staggerDelay(i, kids.length, STEP, "first", CAP)}ms`
				);
			});
		}
		apply();
		const mo = new MutationObserver(apply);
		mo.observe(root, { childList: true });
		return () => {
			mo.disconnect();
			for (const el of Array.from(root.children)) {
				if (el instanceof HTMLElement) {
					el.style.removeProperty("--bento-i");
					el.style.removeProperty("--bento-delay");
				}
			}
		};
	});

	$effect(() => {
		if (!revealing || shown || !ref) return;
		const controller = inView(ref, {
			once: true,
			// Any pixel, not a fraction: a grid taller than ~12 viewports could never
			// show 8% of itself at once, and would stay hidden for good.
			threshold: 0,
			rootMargin: "0px 0px -6% 0px",
			onChange: (v) => {
				if (v) shown = true;
			},
		});
		return () => controller?.destroy?.();
	});
</script>

<!-- Focus arriving inside a still-hidden grid reveals it at once, so a keyboard user never tabs into invisible tiles. -->
<div
	bind:this={ref}
	class={cn(
		"fancy-bento mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
		revealing && "bento-reveal",
		className
	)}
	data-state={revealing ? (shown ? "shown" : "armed") : undefined}
	style:--bento-accent={accent}
	onfocusin={() => (shown = true)}
>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	/*
	 * The hidden state exists only for viewers who allow motion and whose
	 * browser runs scripts — everyone else gets the resting, visible grid
	 * without waiting on JS. Transforms and opacity only.
	 */
	@media (prefers-reduced-motion: no-preference) and (scripting: enabled) {
		.fancy-bento.bento-reveal[data-state="armed"] > :global(*) {
			opacity: 0;
			transform: translate3d(0, 18px, 0) scale(0.985);
		}
		.fancy-bento.bento-reveal[data-state="shown"] > :global(*) {
			transition:
				opacity 600ms cubic-bezier(0.4, 0, 0.2, 1),
				transform 800ms cubic-bezier(0.16, 1, 0.3, 1),
				border-color 300ms cubic-bezier(0.4, 0, 0.2, 1); /* DURATIONS.entrance, EASINGS.out */
			transition-delay: var(--bento-delay, 0ms), var(--bento-delay, 0ms), 0ms;
		}
	}
</style>
