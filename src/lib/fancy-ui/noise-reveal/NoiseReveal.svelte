<script lang="ts" module>
	export interface NoiseRevealProps {
		/** Image URL */
		src: string;
		/** Accessible label for the image */
		alt?: string;
		/** Reveal trigger: "view" = on viewport entry, "manual" = via `revealed` */
		trigger?: "view" | "manual";
		/** Manual reveal state (used with trigger="manual"; also allows re-hiding) */
		revealed?: boolean;
		/** Reveal animation duration in seconds */
		duration?: number;
		/** Delay before reveal in seconds (trigger="view") */
		delay?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createNoiseReveal, type NoiseRevealEngine } from "./noise-reveal-core.js";

	let {
		src,
		alt,
		trigger = "view",
		revealed = false,
		duration = 1.5,
		delay = 0,
		class: className = "",
	}: NoiseRevealProps = $props();

	let container: HTMLDivElement;
	let engine: NoiseRevealEngine | null = $state.raw(null);

	// Scene lifecycle: rebuilt when the texture, the tween length or the trigger changes
	$effect(() => {
		if (!container) return;

		const instance = createNoiseReveal(
			{ container },
			{
				src,
				duration,
				trigger,
				revealed: untrack(() => revealed),
				reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
			}
		);
		if (!instance) return;
		engine = instance;

		return () => {
			engine = null;
			instance.destroy();
		};
	});

	// Viewport trigger: reveal once on first intersection
	$effect(() => {
		if (trigger !== "view" || !container || !engine) return;

		const instance = engine;
		let timeoutId = 0;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						observer.disconnect();
						timeoutId = window.setTimeout(() => instance.setOptions({ target: 1 }), delay * 1000);
					}
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(container);

		return () => {
			observer.disconnect();
			clearTimeout(timeoutId);
		};
	});

	// Manual trigger: follow the `revealed` prop both ways
	$effect(() => {
		if (trigger !== "manual" || !engine) return;
		engine.setOptions({ target: revealed ? 1 : 0 });
	});
</script>

<div
	bind:this={container}
	class={cn("relative h-[400px] w-full", className)}
	role={alt ? "img" : undefined}
	aria-label={alt}
></div>
