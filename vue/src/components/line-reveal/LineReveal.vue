<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for LineReveal
 *
 * Reveals text line by line with a staggered slide-up animation.
 * Line breaks are computed with @chenglou/pretext (canvas text
 * measurement), so no DOM splitting or reflow measurement is needed.
 */
export interface LineRevealProps {
	/** Text to reveal */
	text: string;
	/**
	 * CSS font shorthand used for both measurement and rendering
	 * (canvas `ctx.font` format, e.g. "600 32px Inter, sans-serif").
	 * Prefer named families: `system-ui` can resolve differently between
	 * canvas measurement and DOM rendering.
	 */
	font?: string;
	/** Line height in pixels (defaults to 1.2 × font size) */
	lineHeight?: number;
	/** Delay between lines in seconds */
	stagger?: number;
	/** Animation duration per line in seconds */
	duration?: number;
	/** Initial delay before the first line in seconds */
	delay?: number;
	/** Animate only the first time the component enters the viewport */
	once?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import {
	prepareWithSegments,
	layoutWithLines,
	type PreparedTextWithSegments,
} from "@chenglou/pretext";
import { cn } from "../../utils.js";

defineOptions({ name: "LineReveal", inheritAttrs: false });

const {
	text,
	// Named families only: canvas and CSS can resolve `system-ui` to
	// different fonts (notably on macOS), which skews measured widths.
	font = '600 32px "Helvetica Neue", Helvetica, Arial, sans-serif',
	lineHeight,
	stagger = 0.08,
	duration = 0.7,
	delay = 0,
	once = true,
	class: className,
} = defineProps<LineRevealProps>();

const fontSize = computed(() => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 32));
const resolvedLineHeight = computed(() => lineHeight ?? Math.round(fontSize.value * 1.2));

const containerRef = useTemplateRef<HTMLDivElement>("container");
const containerWidth = ref(0);
const revealed = ref(false);
const prepared = shallowRef<PreparedTextWithSegments | null>(null);

// Measurement requires a canvas context, so this only runs in the browser: the
// first run is in `onMounted` and every later one in a post-flush watcher, so
// nothing here is reachable from a server render. Web fonts must be loaded
// first or the canvas silently measures with the fallback font.
//
// A monotonic token stands in for the Svelte effect's teardown: a run started
// before the text or the font changed (or before unmount) is stale by the time
// its promise settles and must not write `prepared`.
let measureToken = 0;

function measure() {
	const currentText = text;
	const currentFont = font;
	const token = ++measureToken;

	// `document.fonts` (FontFaceSet) may be undefined — jsdom/happy-dom and
	// some older browsers don't implement it — so guard the read instead of
	// letting a missing FontFaceSet throw inside this handler.
	Promise.resolve(document.fonts?.load(currentFont))
		.catch(() => {})
		.then(() => {
			if (token === measureToken) {
				try {
					prepared.value = prepareWithSegments(currentText, currentFont);
				} catch {
					// Missing 2d context (e.g. jsdom) — stay on the pre-measure fallback.
				}
			}
		});
}

// Pure arithmetic on cached measurements — cheap to re-run on every resize
// (containerWidth is tracked by the ResizeObserver below).
const layoutResult = computed(() =>
	prepared.value && containerWidth.value > 0
		? layoutWithLines(prepared.value, containerWidth.value, resolvedLineHeight.value)
		: null
);

const rootStyle = computed(() => ({
	// `font` first, `line-height` second: the shorthand resets the line height,
	// and Vue re-applies every declaration of the style object on each patch, so
	// the longhand always lands after it.
	font,
	lineHeight: `${resolvedLineHeight.value}px`,
	height: layoutResult.value ? `${layoutResult.value.height}px` : undefined,
}));

watch([() => text, () => font], measure, { flush: "post" });

onMounted(() => {
	measure();
	onBeforeUnmount(() => {
		measureToken++;
	});

	const container = containerRef.value as HTMLDivElement;

	// The stand-in for Svelte's `bind:clientWidth`: a ResizeObserver on the same
	// element, plus one read at attach time so the first layout does not wait
	// for a resize.
	const measureWidth = () => {
		containerWidth.value = container.clientWidth;
	};
	measureWidth();

	const resizeObserver = new ResizeObserver(measureWidth);
	resizeObserver.observe(container);
	onBeforeUnmount(() => resizeObserver.disconnect());

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					revealed.value = true;
					if (once) observer.disconnect();
				} else if (!once) {
					revealed.value = false;
				}
			}
		},
		{ threshold: 0.1 }
	);

	observer.observe(container);
	onBeforeUnmount(() => observer.disconnect());
});
</script>

<template>
	<div ref="container" :class="cn('relative w-full', className)" :style="rootStyle">
		<span class="sr-only">{{ text }}</span>
		<template v-if="layoutResult">
			<div
				v-for="(line, i) in layoutResult.lines"
				:key="i"
				class="line-mask"
				:style="{ height: `${resolvedLineHeight}px` }"
				aria-hidden="true"
			>
				<div
					class="line"
					:class="{ revealed }"
					:style="{
						transitionDuration: `${duration}s`,
						transitionDelay: `${delay + i * stagger}s`,
					}"
				>
					{{ line.text }}
				</div>
			</div>
		</template>
		<!-- SSR / pre-measure fallback: keeps text in the HTML and reserves space -->
		<div v-else :style="{ visibility: 'hidden' }" aria-hidden="true">{{ text }}</div>
	</div>
</template>

<style scoped>
.line-mask {
	overflow: hidden;
	/* preserve exact spacing so rendered width matches pretext measurement */
	white-space: pre;
}

.line {
	opacity: 0;
	transform: translateY(105%);
	transition-property: transform, opacity;
	transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

.line.revealed {
	opacity: 1;
	transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
	.line {
		transition-duration: 0.1s !important;
		transition-delay: 0s !important;
	}
}
</style>
