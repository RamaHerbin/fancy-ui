<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface BentoGridProps {
	class?: HTMLAttributes["class"];
	/** Tiles fade up in a stagger the first time the grid scrolls into view. */
	reveal?: boolean;
	/** Colour of the hover glow, the lit bottom edge, the icon ring and the CTA arrow. Any CSS colour; writes `--bento-accent`. */
	accent?: string;
}
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { inView } from "../../internals/motion/in-view.js";
import { staggerDelay } from "../../internals/motion/stagger.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";

defineOptions({ name: "BentoGrid", inheritAttrs: false });

const { class: className = "", reveal = true, accent } = defineProps<BentoGridProps>();

defineSlots<{
	default?: () => unknown;
}>();

/** ms per tile, and the total ceiling the stagger is compressed into. */
const STEP = 70;
const CAP = 420;

const el = useTemplateRef<HTMLDivElement>("el");
// Also set by the root's `focusin`: focus arriving inside a still-hidden grid
// reveals it at once, so a keyboard user never tabs into invisible tiles. (The
// source keeps this note as a template comment; here a root-level comment
// would turn the component into a fragment in development builds.)
const shown = ref(false);

const reduced = useReducedMotion();

const revealing = computed(() => reveal && !reduced.value);

// `style:--bento-accent={accent}` emits nothing when `accent` is unset, so the
// CSS fallback applies; an absent style binding does the same here.
const accentStyle = computed(() =>
	accent === undefined ? undefined : { "--bento-accent": accent }
);

// Index every direct element child: `--bento-i` (its position) and
// `--bento-delay` (its capped stagger delay). Re-indexed when the child
// list changes, so a `v-for` that grows stays in order.
watch(
	el,
	(root, _prev, onCleanup) => {
		if (!root) return;
		function apply() {
			const kids = Array.from(root!.children).filter(
				(node): node is HTMLElement => node instanceof HTMLElement
			);
			kids.forEach((node, i) => {
				node.style.setProperty("--bento-i", String(i));
				node.style.setProperty(
					"--bento-delay",
					`${staggerDelay(i, kids.length, STEP, "first", CAP)}ms`
				);
			});
		}
		apply();
		const mo = new MutationObserver(apply);
		mo.observe(root, { childList: true });
		onCleanup(() => {
			mo.disconnect();
			for (const node of Array.from(root.children)) {
				if (node instanceof HTMLElement) {
					node.style.removeProperty("--bento-i");
					node.style.removeProperty("--bento-delay");
				}
			}
		});
	},
	{ flush: "post" }
);

watch(
	[el, revealing, shown],
	([root, isRevealing, isShown], _prev, onCleanup) => {
		if (!isRevealing || isShown || !root) return;
		const controller = inView(root, {
			once: true,
			// Any pixel, not a fraction: a grid taller than ~12 viewports could never
			// show 8% of itself at once, and would stay hidden for good.
			threshold: 0,
			rootMargin: "0px 0px -6% 0px",
			onChange: (v) => {
				if (v) shown.value = true;
			},
		});
		onCleanup(() => controller?.destroy?.());
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		ref="el"
		:class="
			cn(
				'fancy-bento mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3',
				revealing && 'bento-reveal',
				className
			)
		"
		:data-state="revealing ? (shown ? 'shown' : 'armed') : undefined"
		:style="accentStyle"
		@focusin="shown = true"
	>
		<slot v-if="$slots.default" />
	</div>
</template>

<style scoped>
/*
 * The hidden state exists only for viewers who allow motion and whose
 * browser runs scripts — everyone else gets the resting, visible grid
 * without waiting on JS. Transforms and opacity only.
 */
@media (prefers-reduced-motion: no-preference) and (scripting: enabled) {
	.fancy-bento.bento-reveal[data-state="armed"] > :deep(*) {
		opacity: 0;
		transform: translate3d(0, 18px, 0) scale(0.985);
	}
	.fancy-bento.bento-reveal[data-state="shown"] > :deep(*) {
		transition:
			opacity 600ms cubic-bezier(0.4, 0, 0.2, 1),
			transform 800ms cubic-bezier(0.16, 1, 0.3, 1),
			border-color 300ms cubic-bezier(0.4, 0, 0.2, 1); /* DURATIONS.entrance, EASINGS.out */
		transition-delay: var(--bento-delay, 0ms), var(--bento-delay, 0ms), 0ms;
	}
}
</style>
