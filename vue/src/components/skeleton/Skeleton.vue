<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for Skeleton.
 */
export interface SkeletonProps {
	/** Bone shape: a block, one or more text lines, or a circular avatar */
	variant?: "rect" | "text" | "circle";
	/** Number of text lines to render; only read when `variant="text"`. The
	 * last line renders at 60% width so a paragraph placeholder doesn't read
	 * as a perfect rectangle. */
	lines?: number;
	/** Shimmer sweep, opacity pulse, or a static muted bone (still a valid
	 * loading cue on its own). */
	animation?: "shimmer" | "pulse" | "none";
	/** Whether the placeholder is currently showing. In wrapping mode (a
	 * default slot supplied) this drives the swap to real content; in
	 * standalone mode it drives whether anything renders at all. */
	loading?: boolean;
	/** The one screen-reader announcement. Pass `""` to silence it entirely. */
	label?: string;
	/** Additional CSS classes. Also the usual sizing hook: `rect`/`text` bones
	 * have no intrinsic size, so a caller sizes them with `class="h-4 w-40"`
	 * or similar. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, mergeProps, onMounted, ref, useAttrs, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import { usePresence } from "../../internals/motion/presence.js";

defineOptions({ name: "Skeleton", inheritAttrs: false });

const {
	variant = "rect",
	lines = 1,
	animation = "shimmer",
	loading = true,
	label = "Loading",
	class: className,
} = defineProps<SkeletonProps>();

defineSlots<{
	/** Real content to reveal once `loading` is false. Its mere presence (not
	 * whatever it renders) is what switches Skeleton from standalone to
	 * wrapping mode — see the README for the two ARIA shapes that follow from
	 * that. */
	default?: () => unknown;
}>();

// Presence of the default slot — not anything it renders — is what decides
// the mode, mirroring the Svelte source's `children !== undefined` check.
// Read during render, never cached in a computed: outside development
// `useSlots()` is the plain slots object, not a reactive one, so a computed
// over it would freeze the mode at its first value while a parent re-render
// adds or drops the slot. The template reads `$slots.default` directly for
// the same reason.
const attrs = useAttrs();

// `Math.floor` alone would let a non-finite `lines` (NaN, ±Infinity) leak
// through `Math.max` unclamped (`Math.max(1, NaN)` is `NaN`, and
// `Array.from({ length: NaN })` is `[]` — a caller-supplied bad value would
// silently render zero bones). `Number.isFinite` catches that before the
// clamp instead.
const lineCount = computed(() => {
	if (variant !== "text") return 1;
	const n = Math.floor(lines);
	return Number.isFinite(n) ? Math.max(1, n) : 1;
});
const bones = computed(() => Array.from({ length: lineCount.value }, (_, i) => i));

const elRef = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: elRef });

// The reveal. Bones do not cut to content, they fade out ON TOP of it: the
// content lands in its final, unwrapped position on the first render and
// never moves, while the outgoing bones become an out-of-flow overlay the
// content sizes for them. That answers "what sizes the slot while both
// layers are mounted" with "the content does", and it is why there is no
// layer wrapper here — the root IS the eventual content container (see the
// wrapping branch below), so introducing one, even only for the length of
// the fade, would move the caller's slot content in the DOM tree.
//
// `bonesLingering` deliberately LAGS `loading` by one update. The instant
// `loading` flips false the else-branch renders while this is still true, so
// the overlay mounts already sitting over the real content; the watcher below
// then writes it false, and THAT is what starts the fade.
//
// Seeded `false`, never `true`: a Skeleton that mounts with `loading=false`
// has nothing to reveal and must not flash a set of bones over content that
// was never hidden. The `onMounted` seed below arms this by the time the
// first reveal can happen — synchronously, as part of the initial mount, the
// same guarantee the Svelte effect gets from always running once after
// mount. It is deliberately NOT a `watch(..., { immediate: true })`: an
// immediate post-flush watcher's first run is itself deferred past the
// initial mount, which would race a reveal triggered before that deferred
// run ever executes.
const bonesLingering = ref(false);
onMounted(() => {
	bonesLingering.value = loading;
});

// Opacity only, `DURATIONS.exit` (200ms) on `JS_EASINGS.in` — a departure
// curve for a departing layer. `prefersReducedMotion()` is read inside the
// params factory, which `usePresence` calls at the instant a leg starts —
// never at construction and never during SSR. The overlay's "enter" leg
// (duration 0) is not a real intro: an exit-only surface has to appear
// already at rest, full opacity, exactly like a freshly mounted block.
//
// `usePresence` is constructed BEFORE the `bonesLingering`-lagging watcher
// below on purpose: both are `flush: "post"` and Vue runs same-phase
// watchers in creation order, so this composable's own internal watcher
// reads `overlayOpen` (and therefore `bonesLingering`) while it still holds
// its PRE-toggle value, opening the presence on the same pass the lag
// watcher then closes it on — reproducing the two-commit sequence Svelte
// gets from scheduling the state write and the transition scan separately.
const bonesFade = preset("fade");
const overlayOpen = computed(() => !loading && bonesLingering.value);
const overlayPresence = usePresence(() => overlayOpen.value);
const overlayRef = composeRefs<HTMLDivElement>(
	overlayPresence.register(bonesFade, (entering) =>
		entering
			? { duration: 0 }
			: { duration: prefersReducedMotion() ? 0 : DURATIONS.exit, easing: JS_EASINGS.in }
	)
);

watch(
	() => loading,
	(v) => {
		bonesLingering.value = v;
	},
	{ flush: "post" }
);

// Page-wide shimmer phase sync. Every Skeleton instance on the page reads the
// SAME shared monotonic timeline, so instances that mount at different
// wall-clock moments (e.g. a list revealing rows progressively) still
// converge on one shimmer phase instead of each starting its own visibly
// drifting 1.6s loop. `document.timeline` is a Level-2 Web Animations API
// surface — not universal and absent in jsdom — so this degrades to "every
// instance loops unsynced from 0%, still animates correctly" whenever it's
// unavailable. Never a hard requirement, just a nicety where supported.
//
// Seeded `undefined` ("no phase yet": `rootAttrs()` below then binds no style
// at all) and written from `onMounted`, never before: nothing may differ
// between a server render and its hydration.
const phaseValue = ref<string | undefined>(undefined);
onMounted(() => {
	if (typeof document === "undefined" || typeof document.timeline?.currentTime !== "number") {
		phaseValue.value = undefined;
		return;
	}
	// Mirrors the CSS literal fallback for --ft-skeleton-duration (1.6s).
	// Nothing enforces the two stay equal; update both by hand if the CSS
	// default ever changes.
	const durationMs = 1600;
	const phase = -(Number(document.timeline.currentTime) % durationMs);
	phaseValue.value = `${phase}ms`;
});

// The root's fallthrough attributes, plus the phase once there is one to
// write. Binding `style` with an object whose only entry is `undefined` (or
// binding `undefined` itself next to `v-bind="attrs"`) still makes the server
// renderer emit an empty `style=""`, where the Svelte source writes no
// attribute at all — so the phase is merged in only once it exists, leaving
// the server markup, and the first client render it hydrates against, without
// the attribute. A caller's own `style` still merges with the phase.
function rootAttrs() {
	return phaseValue.value === undefined
		? attrs
		: mergeProps(attrs, { style: { "--ft-skeleton-phase": phaseValue.value } });
}

function boneClass(index: number): string {
	return cn(
		"ft-skeleton-bone",
		index === lineCount.value - 1 && lineCount.value > 1 && "ft-skeleton-bone--short"
	);
}
</script>

<template>
	<!--
		Wrapping mode: the root IS the eventual content container, so it never
		carries role="status" itself — once loading flips false the real content
		takes over this exact node, and a live region that outlives its own
		announcement would be wrong. aria-busy mirrors Button's own semantics (a
		machine-readable "still working" flag, independent of any visual
		dimming).

		The sr-only status span outlives the bones on purpose: a live region
		that is INSERTED already populated is announced unreliably (assistive
		tech registers the region first, then reports changes to it), and
		`loading` false → true is a normal reuse flow here — a refetch on an
		already-rendered wrapper. So the region is mounted for as long as the
		component is, and only its TEXT changes; emptied rather than removed
		once the slot content takes over, so nothing lingers to re-announce.
	-->
	<div
		v-if="$slots.default !== undefined"
		ref="el"
		:class="cn('ft-skeleton', className)"
		v-bind="rootAttrs()"
		:aria-busy="loading ? 'true' : undefined"
		:data-variant="variant"
		:data-animation="animation"
		:data-loading="loading ? 'true' : undefined"
	>
		<template v-if="loading">
			<div v-for="i in bones" :key="i" :class="boneClass(i)" aria-hidden="true"></div>
		</template>
		<template v-else>
			<!--
				The bones on their way out, `aria-hidden` and out of flow. They
				are NOT the live region: `role="status"` lives and dies with the
				in-flow bones above, so the announcement never outlives itself by
				lingering into the fade. `pointer-events: none` (see the
				stylesheet) is what makes the revealed content clickable from
				frame one despite something still being painted over it.
			-->
			<div
				v-if="overlayPresence.mounted"
				:ref="overlayRef"
				class="ft-skeleton-bones-out"
				aria-hidden="true"
			>
				<div v-for="i in bones" :key="i" :class="boneClass(i)" aria-hidden="true"></div>
			</div>
			<slot></slot>
		</template>
		<span v-if="label !== ''" role="status" aria-live="polite" class="sr-only">{{
			loading ? label : ""
		}}</span>
	</div>
	<!--
		Standalone mode: Skeleton IS the loading indicator (a list seeded with
		placeholder rows before data arrives), so the root itself announces —
		copying PixelLoader/TypingIndicator's own role="status" placement
		exactly. There is no slot content to swap to here, so `loading=false`
		with nothing supplied renders nothing at all rather than leaving inert,
		unannounced bones sitting in the DOM.

		That is also why standalone mode cannot keep its live region mounted the
		way wrapping mode does above: with nothing rendered at all there is no
		node left to host one, and the "renders nothing / ref is null" contract
		(shared with Presence) outranks it. A caller who toggles `loading` back
		and forth on a persistent node wants wrapping mode.
	-->
	<div
		v-else-if="loading"
		ref="el"
		:class="cn('ft-skeleton', className)"
		v-bind="rootAttrs()"
		role="status"
		aria-live="polite"
		:data-variant="variant"
		:data-animation="animation"
		:data-loading="loading ? 'true' : undefined"
	>
		<div v-for="i in bones" :key="i" :class="boneClass(i)" aria-hidden="true"></div>
		<span v-if="label !== ''" class="sr-only">{{ label }}</span>
	</div>
</template>

<style scoped>
.ft-skeleton {
	display: block;
	/* NEW, and a named layout-property exception: the containing block for
	   the outgoing bones overlay. `display: block` is unchanged; this
	   changes nothing for a consumer unless they were relying on the
	   skeleton root NOT being a containing block for an absolutely
	   positioned descendant of their own content. */
	position: relative;
}

/* The outgoing bones, for the length of the fade only. Out of flow, so the
   content underneath is what sizes the root and the container never
   overshoots and settles; `inset: 0` then hands the bones exactly the
   content's own box to fade out over. Not interactive for a single frame of
   it — the revealed content is clickable from the moment it lands. */
.ft-skeleton-bones-out {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.ft-skeleton-bone {
	position: relative;
	display: block;
	overflow: hidden;
	background-color: var(
		--ft-skeleton-base,
		light-dark(oklch(0.93 0 0), oklch(0.32 0 0))
	); /* tokens.* n/a: component-owned */
	border-radius: var(--ft-skeleton-radius, 0.375rem); /* tokens.* n/a: component-owned */
}

/* `rect` is the DEFAULT variant and has no other height rule anywhere — a
   `display: block` bone with no content is otherwise 0px tall. `100%`
   resolves against the root the consumer already sizes (`class="h-4"`);
   `min-height` is the same 0.85em floor `text` gets, for the case the root
   itself has no explicit height (an auto-height wrapper in wrapping mode) so
   a bone is never literally invisible. Deliberately not applied to `circle`,
   which sizes itself via `aspect-ratio` instead. */
[data-variant="rect"] .ft-skeleton-bone {
	height: 100%;
	min-height: 0.85em;
}

[data-variant="text"] .ft-skeleton-bone {
	border-radius: 0.25rem;
	height: 0.85em;
}
/* Line spacing isn't part of the frozen contract; without it, stacked text
   bones would visually touch. Kept minimal and relative to font size so it
   scales with whatever text size the caller's `class` sets. */
[data-variant="text"] .ft-skeleton-bone + .ft-skeleton-bone {
	margin-top: 0.5em;
}
.ft-skeleton-bone--short {
	width: 60%;
}

[data-variant="circle"] .ft-skeleton-bone {
	border-radius: 9999px;
	aspect-ratio: 1 / 1;
}

/*
 * Shimmer is a translated ::after overlay — transform only, per the family's
 * "opacity/transform animate, nothing else" rule. Animating
 * `background-position` (ThinkingIndicator's own text-shimmer technique)
 * would violate that rule for a plain background property, so the sweep here
 * is a separate absolutely-positioned layer that only ever moves via
 * `translateX`.
 */
[data-animation="shimmer"] .ft-skeleton-bone::after {
	content: "";
	position: absolute;
	inset: 0;
	transform: translateX(-100%);
	background-image: linear-gradient(
		90deg,
		transparent,
		var(--ft-skeleton-highlight, color-mix(in oklab, currentColor 12%, transparent)),
		transparent
	);
}

/* :dir(rtl) reverses the sweep by playing the SAME keyframe backward rather
   than authoring a mirrored one — half the CSS, same visual result (the
   highlight still starts at the reading-direction's leading edge). Kept as a
   plain custom-property override on the root rather than chained onto the
   `::after` selector itself, matching the Svelte source. */
.ft-skeleton:dir(rtl) {
	--ft-skeleton-shimmer-direction: reverse;
}

@media (prefers-reduced-motion: no-preference) {
	[data-animation="shimmer"] .ft-skeleton-bone::after {
		animation: ft-skeleton-shimmer var(--ft-skeleton-duration, 1.6s) linear infinite; /* tokens.* n/a: component-owned */
		animation-delay: var(--ft-skeleton-phase, 0s);
		animation-direction: var(--ft-skeleton-shimmer-direction, normal);
	}
	[data-animation="pulse"] .ft-skeleton-bone {
		animation: ft-skeleton-pulse var(--ft-skeleton-duration, 1.6s) ease-in-out infinite; /* tokens.* n/a: a symmetric breathe wants a symmetric curve, not the asymmetric --ft-ease-inout */
	}
}

@keyframes ft-skeleton-shimmer {
	from {
		transform: translateX(-100%);
	}
	to {
		transform: translateX(100%);
	}
}

@keyframes ft-skeleton-pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.6;
	}
}

/* A forced-colors palette (Windows High Contrast) replaces `background-color`
   wholesale — the bone's only visual — so without this every bone repaints
   to `Canvas` and vanishes against the page (the shimmer/pulse are forced
   too). The sr-only label still announces, but the visible placeholder is
   the entire point of a skeleton, so an outline stands in for the bone. */
@media (forced-colors: active) {
	.ft-skeleton-bone {
		outline: 1px solid CanvasText;
		outline-offset: -1px;
	}
}
</style>
