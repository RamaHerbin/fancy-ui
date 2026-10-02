<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for Marquee
 *
 * An infinite conveyor of content (a row, or a column with `vertical`),
 * built by rendering several copies of its children side by side and sliding
 * the whole track by `-100% - gap` on a seamless loop. Once mounted, the CSS
 * loop is upgraded to Web Animations so `pauseOnHover` can ease the conveyor
 * to a stop instead of freezing it.
 */
export interface MarqueeProps {
	/** Reverse the scroll direction */
	reverse?: boolean;
	/** Ease the conveyor to a stop while the pointer (or focus) is inside */
	pauseOnHover?: boolean;
	/** Scroll vertically instead of horizontally */
	vertical?: boolean;
	/** Number of copies of the children rendered on the track */
	repeat?: number;
	/** Dissolve items at both edges with a gradient mask */
	fade?: boolean;
	/** Speed multiplier applied on top of `--duration` (2 = twice as fast) */
	speed?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";

defineOptions({ name: "Marquee", inheritAttrs: false });

defineSlots<{ default?(): unknown }>();

const {
	class: className,
	reverse = false,
	pauseOnHover = false,
	vertical = false,
	repeat = 4,
	fade = true,
	speed = 1,
} = defineProps<MarqueeProps>();

/** Time constant (ms) of the exponential ease on playbackRate. The rate
 * covers ~97% of the distance to its target in 3.5τ ≈ 500 ms, which reads
 * as a conveyor braking and pulling away rather than a hard freeze. */
const EASE_TAU = 140;
const SETTLE_EPSILON = 0.002;
const DEFAULT_DURATION_MS = 40_000;

// Registered before this component's own `onMounted`, so `reduced` is
// already answered by the time the tracks are upgraded.
const reduced = useReducedMotion();

const root = useTemplateRef<HTMLDivElement>("root");
/** True once the tracks are driven by script-owned animations; the CSS
 * keyframe is switched off at that point so the two never stack. */
const upgraded = ref(false);

const safeSpeed = computed(() => (Number.isFinite(speed) && speed > 0 ? speed : 1));

// Hover state and the eased factor live outside the reactive graph: they
// change every frame and nothing in the markup depends on them.
let engaged = false;
let factor = 1;
let animations: Animation[] = [];
let rafId = 0;
let lastTs = 0;
/** Where the previous set of animations stood when it was torn down, as a
 * position along the loop (0–1, independent of direction and duration), so
 * a rebuild (reverse / vertical / repeat / class toggled) neither snaps to
 * zero nor mirrors when the direction flips. */
let resumeAt: number | null = null;
let teardown: (() => void) | null = null;

function parseDuration(raw: string): number {
	const match = /^\s*([\d.]+)\s*(ms|s)\s*$/i.exec(raw);
	if (!match) return DEFAULT_DURATION_MS;
	// The regex guarantees both groups; `!` only satisfies noUncheckedIndexedAccess.
	const value = Number.parseFloat(match[1]!);
	if (!Number.isFinite(value) || value <= 0) return DEFAULT_DURATION_MS;
	return match[2]!.toLowerCase() === "ms" ? value : value * 1000;
}

function applyRate() {
	const rate = safeSpeed.value * factor;
	for (const animation of animations) animation.playbackRate = rate;
}

function tick(ts: number) {
	const dt = lastTs ? Math.min(ts - lastTs, 64) : 16;
	lastTs = ts;
	const target = engaged ? 0 : 1;
	factor += (target - factor) * (1 - Math.exp(-dt / EASE_TAU));
	if (Math.abs(target - factor) < SETTLE_EPSILON) factor = target;
	applyRate();
	if (factor === target) {
		// Settled: the loop sleeps until the next enter/leave.
		rafId = 0;
		lastTs = 0;
		return;
	}
	rafId = requestAnimationFrame(tick);
}

function wake() {
	if (!animations.length || rafId) return;
	lastTs = 0;
	rafId = requestAnimationFrame(tick);
}

function setEngaged(next: boolean) {
	engaged = next && pauseOnHover;
	wake();
}

function onFocusOut(event: FocusEvent) {
	if (!root.value?.contains(event.relatedTarget as Node | null)) setEngaged(false);
}

// Upgrade the CSS conveyor to Web Animations so the speed can be eased.
// The source's single `$effect` splits into a mount hook plus one post-flush
// watcher (direction, axis, copy count, class, reduced motion); the previous
// run's cleanup is called first, as the effect's return would be.
function build() {
	teardown?.();
	teardown = null;
	const el = root.value;
	const isVertical = vertical;
	const isReverse = reverse;
	if (!el || reduced.value) return;
	if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") return;

	const styles = getComputedStyle(el);
	const duration = parseDuration(styles.getPropertyValue("--duration"));
	const gapPx = Number.parseFloat(isVertical ? styles.rowGap : styles.columnGap) || 0;
	const axis = isVertical ? "translateY" : "translateX";
	const keyframes: Keyframe[] = [
		{ transform: `${axis}(0)` },
		{ transform: `${axis}(calc(-100% - ${gapPx}px))` },
	];

	const tracks = Array.from(el.querySelectorAll<HTMLElement>(":scope > [data-marquee-track]"));
	// Pick up where the motion already is, so the hand-off is seamless: the
	// previous script animation if this is a rebuild, otherwise the CSS
	// keyframe (whose clock runs `speed` times faster than ours).
	let startTime = 0;
	if (resumeAt !== null) {
		startTime = (isReverse ? 1 - resumeAt : resumeAt) * duration;
	} else {
		const running = tracks[0]?.getAnimations?.()[0];
		if (running && typeof running.currentTime === "number") {
			startTime = running.currentTime * safeSpeed.value;
		}
	}

	animations = tracks
		.map((track) =>
			track.animate(keyframes, {
				duration,
				iterations: Infinity,
				easing: "linear",
				direction: isReverse ? "reverse" : "normal",
			})
		)
		.filter(Boolean);
	for (const animation of animations) animation.currentTime = startTime % duration;
	applyRate();
	upgraded.value = true;
	if (factor !== (engaged ? 0 : 1)) wake();

	teardown = () => {
		if (rafId) cancelAnimationFrame(rafId);
		rafId = 0;
		const t = animations[0]?.currentTime;
		if (typeof t === "number") {
			const progress = (t % duration) / duration;
			resumeAt = isReverse ? 1 - progress : progress;
		} else {
			resumeAt = null;
		}
		for (const animation of animations) animation.cancel?.();
		animations = [];
		upgraded.value = false;
	};
}

onMounted(build);

watch(
	// `cn()` normalises an array/object class to a string, so an inline
	// `:class="[...]"` (a new reference every parent render) only rebuilds
	// when the resolved classes actually change.
	[() => vertical, () => reverse, () => repeat, () => cn(className), () => reduced.value],
	build,
	{ flush: "post" }
);

onBeforeUnmount(() => {
	teardown?.();
	teardown = null;
});

// A live `speed` change only needs the rate re-applied, not a rebuild.
watch(safeSpeed, applyRate);

// Turning pauseOnHover off while hovered releases the brake.
watch(
	() => pauseOnHover,
	(next) => {
		if (!next && engaged) setEngaged(false);
	}
);
</script>

<template>
	<div
		ref="root"
		:class="
			cn(
				'marquee group flex [gap:var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]',
				vertical ? 'marquee-vertical flex-col' : 'flex-row',
				fade && 'marquee-fade',
				upgraded && 'marquee-upgraded',
				className
			)
		"
		:style="{ '--marquee-speed': safeSpeed }"
		:data-paused-on-hover="pauseOnHover ? '' : undefined"
		@pointerenter="setEngaged(true)"
		@pointerleave="setEngaged(false)"
		@focusin="setEngaged(true)"
		@focusout="onFocusOut"
	>
		<div
			v-for="(_, index) in repeat"
			:key="index"
			data-marquee-track
			:aria-hidden="index > 0 ? 'true' : undefined"
			:class="
				cn(
					'flex shrink-0 justify-around [gap:var(--gap)]',
					vertical ? 'animate-marquee-vertical flex-col' : 'animate-marquee flex-row',
					pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''
				)
			"
			:style="{ animationDirection: reverse ? 'reverse' : 'normal' }"
		>
			<slot />
		</div>
	</div>
</template>

<style scoped>
.animate-marquee {
	animation: marquee calc(var(--duration) / var(--marquee-speed, 1)) linear infinite;
	will-change: transform;
}

.animate-marquee-vertical {
	animation: marquee-vertical calc(var(--duration) / var(--marquee-speed, 1)) linear infinite;
	will-change: transform;
}

/* Script-owned animations have taken over: silence the CSS keyframe so the
   track is not moved twice. */
.marquee-upgraded > .animate-marquee,
.marquee-upgraded > .animate-marquee-vertical {
	animation: none;
}

/* Edge fades: an eased (not linear) alpha ramp, so items dissolve into the
   edge instead of hitting a visible line. Width via --marquee-fade. */
.marquee-fade {
	--_fade: var(--marquee-fade, 12%);
	--_mask: linear-gradient(
		to right,
		transparent,
		rgb(0 0 0 / 0.1) calc(var(--_fade) * 0.25),
		rgb(0 0 0 / 0.4) calc(var(--_fade) * 0.5),
		rgb(0 0 0 / 0.8) calc(var(--_fade) * 0.75),
		#000 var(--_fade),
		#000 calc(100% - var(--_fade)),
		rgb(0 0 0 / 0.8) calc(100% - var(--_fade) * 0.75),
		rgb(0 0 0 / 0.4) calc(100% - var(--_fade) * 0.5),
		rgb(0 0 0 / 0.1) calc(100% - var(--_fade) * 0.25),
		transparent
	);
	-webkit-mask-image: var(--_mask);
	mask-image: var(--_mask);
}

.marquee-fade.marquee-vertical {
	--_mask: linear-gradient(
		to bottom,
		transparent,
		rgb(0 0 0 / 0.1) calc(var(--_fade) * 0.25),
		rgb(0 0 0 / 0.4) calc(var(--_fade) * 0.5),
		rgb(0 0 0 / 0.8) calc(var(--_fade) * 0.75),
		#000 var(--_fade),
		#000 calc(100% - var(--_fade)),
		rgb(0 0 0 / 0.8) calc(100% - var(--_fade) * 0.75),
		rgb(0 0 0 / 0.4) calc(100% - var(--_fade) * 0.5),
		rgb(0 0 0 / 0.1) calc(100% - var(--_fade) * 0.25),
		transparent
	);
}

@keyframes marquee {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(calc(-100% - var(--gap)));
	}
}

@keyframes marquee-vertical {
	from {
		transform: translateY(0);
	}
	to {
		transform: translateY(calc(-100% - var(--gap)));
	}
}

/* Reduced motion: a still row with the same composition — edge fades stay. */
@media (prefers-reduced-motion: reduce) {
	.animate-marquee,
	.animate-marquee-vertical {
		animation: none;
		will-change: auto;
	}
}
</style>
