<script lang="ts">
import type { HTMLAttributes } from "vue";

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
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { createNoiseReveal, type NoiseRevealEngine } from "./noise-reveal-core.js";

defineOptions({ name: "NoiseReveal", inheritAttrs: false });

const {
	src,
	alt,
	trigger = "view",
	revealed = false,
	duration = 1.5,
	delay = 0,
	class: className = "",
} = defineProps<NoiseRevealProps>();

const containerRef = useTemplateRef<HTMLDivElement>("container");

// A ref, not a plain local: the two trigger watchers below must re-run the
// moment the scene publishes its engine, which is what the source's
// `$state.raw` buys there.
const engine = shallowRef<NoiseRevealEngine | null>(null);

// `matchMedia` is only ever asked from `onMounted`, so the value read at build
// time is the browser's answer and nothing is read during a server render.
const reducedMotion = useReducedMotion();

// Scene lifecycle. Both functions read the props directly and are only ever
// called from a lifecycle hook or a watch callback, so the `revealed` read that
// seeds the initial progress is untracked by construction — the mirror of the
// source's `untrack`, and the reason toggling `revealed` cannot rebuild the
// scene.
function build() {
	const container = containerRef.value;
	if (!container) return;

	const instance = createNoiseReveal(
		{ container },
		{
			src,
			duration,
			trigger,
			revealed,
			reducedMotion: reducedMotion.value,
		}
	);
	if (!instance) return;
	engine.value = instance;
}

function teardown() {
	const instance = engine.value;
	if (!instance) return;
	engine.value = null;
	instance.destroy();
}

onMounted(build);

// Rebuilt when the texture, the tween length or the trigger changes — the three
// values the source's scene `$effect` reads reactively.
watch(
	[() => src, () => duration, () => trigger],
	() => {
		teardown();
		build();
	},
	{ flush: "post" }
);

onBeforeUnmount(teardown);

// Viewport trigger: reveal once on first intersection
watch(
	[() => trigger, containerRef, engine],
	([currentTrigger, container, currentEngine], _previous, onCleanup) => {
		if (currentTrigger !== "view" || !container || !currentEngine) return;

		const instance = currentEngine;
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

		onCleanup(() => {
			observer.disconnect();
			clearTimeout(timeoutId);
		});
	},
	{ flush: "post" }
);

// Manual trigger: follow the `revealed` prop both ways
watch(
	[() => trigger, engine, () => revealed],
	([currentTrigger, currentEngine, currentRevealed]) => {
		if (currentTrigger !== "manual" || !currentEngine) return;
		currentEngine.setOptions({ target: currentRevealed ? 1 : 0 });
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		ref="container"
		:class="cn('relative h-[400px] w-full', className)"
		:role="alt ? 'img' : undefined"
		:aria-label="alt"
	></div>
</template>
