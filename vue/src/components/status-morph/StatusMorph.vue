<script lang="ts">
import type { HTMLAttributes } from "vue";

/** The four states StatusMorph can be in. */
export type StatusMorphState = "idle" | "loading" | "success" | "error";

const DEFAULT_LABELS = { loading: "Loading", success: "Done", error: "Failed" } as const;

/**
 * Props for StatusMorph.
 */
export interface StatusMorphProps {
	/** Milliseconds until an automatic reset to `"idle"` after `"success"` or
	 * `"error"`. `0` disables the timer entirely (manual reset only). Cleared
	 * whenever `state` changes again — internally or externally — or on
	 * unmount. */
	resetAfter?: number;
	/** Live-region text per state. Unset keys fall back to the defaults. */
	labels?: { loading?: string; success?: string; error?: string };
	/** `"current"` paints every glyph in `currentColor` (matches the
	 * surrounding text/button colour). `"semantic"` reads the AI-family
	 * `--ft-status-running/-done/-error` vocabulary instead — the ring track
	 * stays neutral in both. */
	tone?: "current" | "semantic";
	/** Best-effort tactile feedback (the `success`/`error` haptic patterns)
	 * on entering those states. Opt-in; silently a no-op wherever the
	 * Vibration API is unsupported or refused. */
	haptic?: boolean;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { vibrate } from "../../internals/motion/haptics.js";

defineOptions({ name: "StatusMorph", inheritAttrs: false });

const {
	resetAfter = 1800,
	labels = {},
	tone = "current",
	haptic = false,
	class: className,
} = defineProps<StatusMorphProps>();

const attrs = useAttrs();

defineSlots<{
	/** Custom idle content, rendered in the same `calc(1em + 1px)` footprint
	 * instead of the default transparent scaffold — so swapping to it never
	 * shifts layout. */
	idle?: () => unknown;
}>();

/** Current state, two-way bound via `v-model:state`. The component only
 * ever writes it back to `"idle"` itself, when `resetAfter` fires — every
 * other write is the caller's, and is always honoured: StatusMorph never
 * fights its owner. */
const state = defineModel<StatusMorphState>("state", { default: "idle" });

const el = useTemplateRef<HTMLSpanElement>("el");
defineExpose({ ref: el });

// Flipped once, on mount. Until then the live region renders in place —
// which is exactly what the server emits, and exactly what the Svelte
// source does: `use:portal` is an action, and actions never run during SSR,
// so the server HTML keeps the `<div role="status">` inline inside the span
// and the node is relocated on mount. Rendering the Teleport unconditionally
// instead would emit only the teleport anchors into the main stream (the
// live region landing in the separate teleports buffer), and the client's
// first vdom would then carry a child the server HTML does not have —
// a hydration children mismatch on the root span.
const mounted = ref(false);

const resolvedLabels = computed(() => ({ ...DEFAULT_LABELS, ...labels }));

const liveText = computed(() =>
	state.value === "loading"
		? resolvedLabels.value.loading
		: state.value === "success"
			? resolvedLabels.value.success
			: state.value === "error"
				? resolvedLabels.value.error
				: ""
);

// The auto-reset timer for success/error → idle. The Svelte $effect keyed on
// `state` (and `resetAfter`) gets "clear on any state change" for free from
// the effect's own teardown; here the timer is owned explicitly instead,
// because the first run has to happen in `onMounted` rather than inside the
// watcher. An `immediate: true` watcher would look equivalent and is not:
// Vue runs an immediate callback synchronously in SETUP, which on the server
// means every server render schedules a `setTimeout` (with a no-op cleanup)
// that 1.8s later writes to a discarded instance. The Svelte $effect never
// runs during SSR at all, so mount-time is the faithful moment.
//
// `armReset` clears the pending timer before arming a new one, which is what
// makes a caller flipping success → error mid-countdown cancel the stale
// success→idle timer and start a fresh error→idle one.
let resetTimer: ReturnType<typeof setTimeout> | undefined;

function clearResetTimer() {
	if (resetTimer !== undefined) {
		clearTimeout(resetTimer);
		resetTimer = undefined;
	}
}

function armReset(current: StatusMorphState, currentResetAfter: number) {
	clearResetTimer();
	if ((current === "success" || current === "error") && currentResetAfter > 0) {
		resetTimer = setTimeout(() => {
			resetTimer = undefined;
			state.value = "idle";
		}, currentResetAfter);
	}
}

watch(
	[state, () => resetAfter],
	([current, currentResetAfter]) => armReset(current, currentResetAfter),
	{
		flush: "post",
	}
);

onBeforeUnmount(clearResetTimer);

// Best-effort tactile feedback on entering success/error. `vibrate()` is
// itself a no-op — returns false, never throws — on any environment without
// a Vibration API or outside a user gesture, so this needs no touch/pointer
// check of its own; see haptics.ts.
//
// `lastHapticState` (plain, non-reactive) is what makes this fire on
// TRANSITION into success/error rather than on every run where `haptic` is
// true: without it, flipping `haptic` false→true while already sitting in
// `state === "success"` would buzz again with nothing having changed.
// Mounting straight into success/error is intentionally still a
// "transition" here, from the first run's own perspective — which is why
// `runHaptic` is called from `onMounted` as well as from the watcher. It is
// deliberately not an `immediate: true` watcher: that would reach the
// Vibration API during a server render, which the Svelte $effect never does.
let lastHapticState: StatusMorphState | undefined;

function runHaptic(current: StatusMorphState, currentHaptic: boolean) {
	const changed = current !== lastHapticState;
	lastHapticState = current;
	if (!currentHaptic || !changed) return;
	if (current === "success") vibrate("success");
	else if (current === "error") vibrate("error");
}

watch([state, () => haptic], ([current, currentHaptic]) => runHaptic(current, currentHaptic), {
	flush: "post",
});

// The single first run of both effects, at the moment Svelte's own $effects
// first run: after mount, never on the server.
onMounted(() => {
	mounted.value = true;
	armReset(state.value, resetAfter);
	runHaptic(state.value, haptic);
});
</script>

<template>
	<span
		ref="el"
		:class="cn('ft-statusmorph', className)"
		v-bind="attrs"
		:data-state="state"
		:data-tone="tone"
	>
		<span v-if="$slots.idle" class="ft-statusmorph-idle" aria-hidden="true">
			<slot name="idle" />
		</span>
		<svg class="ft-statusmorph-svg" viewBox="0 0 24 24" aria-hidden="true" :data-state="state">
			<circle
				class="ft-statusmorph-track"
				cx="12"
				cy="12"
				r="10"
				pathLength="1"
				vector-effect="non-scaling-stroke"
			/>
			<circle
				class="ft-statusmorph-arc"
				cx="12"
				cy="12"
				r="10"
				pathLength="1"
				vector-effect="non-scaling-stroke"
			/>
			<path
				class="ft-statusmorph-check"
				d="M7 12.5l3.5 3.5L17 9"
				pathLength="1"
				vector-effect="non-scaling-stroke"
			/>
			<path
				class="ft-statusmorph-cross-a"
				d="M8 8l8 8"
				pathLength="1"
				vector-effect="non-scaling-stroke"
			/>
			<path
				class="ft-statusmorph-cross-b"
				d="M16 8l-8 8"
				pathLength="1"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
		<!--
			Mounted unconditionally from first render, not conditionally per state —
			a live region has to already exist before its content changes for
			assistive tech to reliably announce the change. Portalled to
			document.body so this text never joins a host element's accessible-name
			computation: rendered as a Button's iconStart slot, an un-portalled span
			here would make a <button> announce "Loading Save changes" instead of
			"Save changes", re-announced on every focus. role="status" stays
			static; only aria-live toggles polite↔assertive for the error case —
			a live aria-live swap is a more consistently supported AT pattern than
			a live role swap.
		-->
		<Portal :disabled="!mounted">
			<div role="status" :aria-live="state === 'error' ? 'assertive' : 'polite'" class="sr-only">
				{{ liveText }}
			</div>
		</Portal>
	</span>
</template>

<style scoped>
.ft-statusmorph {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: calc(1em + 1px);
	height: calc(1em + 1px);
	vertical-align: -0.125em;
}

.ft-statusmorph-idle,
.ft-statusmorph-svg {
	position: absolute;
	inset: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

/*
 * `calc(1em + 1px)`, `stroke-width: 2`, and the `color-mix(in oklab,
 * currentColor 30%, transparent)` track tint all match `.ft-btn-spinner`'s
 * own values exactly (Button.vue, read-only) — StatusMorph's loading
 * ring is meant to read as the same visual weight, just built from SVG
 * `<circle>`s instead of a CSS border so the ring can later morph into a
 * drawn check/cross via the same `stroke-dasharray`/`stroke-dashoffset`
 * coordinate system. Not pixel-identical, though: Button's border sits
 * flush with the box edge, while this ring is `r="10"` inside a 24-unit
 * viewBox — its outer diameter reads roughly 8% smaller.
 */
.ft-statusmorph-svg {
	width: calc(1em + 1px);
	height: calc(1em + 1px);
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
	vector-effect: non-scaling-stroke;
}

/*
 * All five shapes always exist in the DOM — this IS the CLS-free idle
 * answer: idle is simply every shape at opacity 0 (the default below,
 * unless a state-specific rule turns one on), the exact same 24×24
 * footprint as every other state, no special-casing needed for "don't
 * shift layout".
 */
.ft-statusmorph-track,
.ft-statusmorph-arc,
.ft-statusmorph-check,
.ft-statusmorph-cross-a,
.ft-statusmorph-cross-b {
	opacity: 0;
}
.ft-statusmorph-arc,
.ft-statusmorph-check {
	transform-box: fill-box;
	transform-origin: center;
}
.ft-statusmorph-check {
	transform: scale(1);
}

.ft-statusmorph-track {
	stroke-dasharray: 1;
	/* Neutral in both tones — matches `.ft-btn-spinner`'s own track
	   treatment, which never re-tints regardless of the spin state. */
	stroke: var(--ft-statusmorph-track, color-mix(in oklab, currentColor 30%, transparent));
}
.ft-statusmorph-arc {
	/* A quarter arc (dash 0.25, gap 0.75) for the loading spinner; closes to
	   a full solid ring (dasharray 1, same as the track) once success/error
	   is reached — the "ring close" the timing table below animates. */
	stroke-dasharray: 0.25 0.75;
}
svg[data-state="success"] .ft-statusmorph-track,
svg[data-state="success"] .ft-statusmorph-arc,
svg[data-state="error"] .ft-statusmorph-track,
svg[data-state="error"] .ft-statusmorph-arc,
svg[data-state="loading"] .ft-statusmorph-track,
svg[data-state="loading"] .ft-statusmorph-arc {
	opacity: 1;
}
svg[data-state="success"] .ft-statusmorph-arc,
svg[data-state="error"] .ft-statusmorph-arc {
	/* `1 1`, not the bare `1` the track uses statically: transitioning a
	   two-item dasharray (`0.25 0.75`, the loading state) to a one-item
	   list needs the UA to repeat the shorter list to match lengths before
	   interpolating, which not every engine does consistently. `1 1`
	   repeats to exactly what `1` already means, so nothing here changes
	   visually while every engine now has a same-length list to animate. */
	stroke-dasharray: 1 1;
}

/*
 * Check/cross draw via the classic pathLength-normalised dash trick: a
 * single dash exactly as long as the path (dasharray: 1) with dashoffset
 * toggling between 1 (shifted a full period — invisible) and 0 (fully
 * drawn). Opacity flips straight to 1 the instant a shape becomes relevant
 * (no transition declared for it) because the dash trick itself already
 * hides an undrawn path at any opacity — the reveal comes from dashoffset
 * animating, not from a separate fade.
 */
.ft-statusmorph-check,
.ft-statusmorph-cross-a,
.ft-statusmorph-cross-b {
	stroke-dasharray: 1;
	stroke-dashoffset: 1;
}
svg[data-state="success"] .ft-statusmorph-check {
	opacity: 1;
	stroke-dashoffset: 0;
}
svg[data-state="error"] .ft-statusmorph-cross-a,
svg[data-state="error"] .ft-statusmorph-cross-b {
	opacity: 1;
	stroke-dashoffset: 0;
}

/* tone="semantic" swaps the arc/check/cross colour resolution per state;
   the literal fallbacks are the exact AI-family --ft-status-* values
   (ToolCall, CopyButton, and 15 other sites read the same three). tone
   defaults to "current" (currentColor everywhere), so these rules only
   ever apply under [data-tone="semantic"]. */
.ft-statusmorph[data-tone="semantic"] svg[data-state="loading"] .ft-statusmorph-arc {
	stroke: var(
		--ft-statusmorph-loading,
		var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
	);
}
.ft-statusmorph[data-tone="semantic"] svg[data-state="success"] .ft-statusmorph-arc,
.ft-statusmorph[data-tone="semantic"] svg[data-state="success"] .ft-statusmorph-check {
	stroke: var(
		--ft-statusmorph-success,
		var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
	);
}
.ft-statusmorph[data-tone="semantic"] svg[data-state="error"] .ft-statusmorph-arc,
.ft-statusmorph[data-tone="semantic"] svg[data-state="error"] .ft-statusmorph-cross-a,
.ft-statusmorph[data-tone="semantic"] svg[data-state="error"] .ft-statusmorph-cross-b {
	stroke: var(
		--ft-statusmorph-error,
		var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
	);
}

/*
 * Idle content (when supplied) only shows in the idle state; the default
 * transparent SVG scaffold occupies the exact same footprint the rest of
 * the time, so swapping between the two never shifts layout.
 */
.ft-statusmorph-idle {
	opacity: 0;
}
.ft-statusmorph[data-state="idle"] .ft-statusmorph-idle {
	opacity: 1;
}

/*
 * Every transition/keyframe below lives inside no-preference — outside it,
 * the rules above already ARE the correct final glyph for the current
 * state (opacity, stroke-dasharray, stroke-dashoffset, colour), so reduced
 * motion shows it instantly with nothing further to override.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-statusmorph-track {
		/* An arrival (the ring becoming visible), so --ft-ease-out — the
		   arc below shares this same duration/easing for its own opacity so
		   track and arc fade in/out together instead of in two visible
		   pieces (the arc previously used --ft-ease-in, a departure curve,
		   for what is on the opacity axis an arrival either way). */
		transition: opacity var(--ft-duration-exit, 200ms)
			var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	}
	.ft-statusmorph-arc {
		transition:
			stroke-dasharray var(--ft-duration-exit, 200ms)
				var(--ft-ease-in, cubic-bezier(0.7, 0, 0.84, 0)),
			opacity var(--ft-duration-exit, 200ms) var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	}
	/* Kept spinning through success/error, not scoped to `loading` alone —
	   a closed ring rotating is visually identical to a static one, and
	   stopping the animation the instant `data-state` changes would make
	   `transform` snap back to `none` in the same frame the dasharray
	   starts closing, reading as a visible teleport-then-grow instead of a
	   continuous close. */
	svg[data-state="loading"] .ft-statusmorph-arc,
	svg[data-state="success"] .ft-statusmorph-arc,
	svg[data-state="error"] .ft-statusmorph-arc {
		animation: ft-statusmorph-spin 0.8s linear infinite;
	}

	/* The lead-in before the check starts drawing is --ft-duration-micro
	   (tokens.ts DURATIONS.micro), the rung that exists for exactly this:
	   a glyph-scale beat long enough to read as a beat and no longer. */
	.ft-statusmorph-check {
		transition: stroke-dashoffset var(--ft-duration-base, 300ms)
			var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1)) var(--ft-duration-micro, 80ms);
	}
	/* The one --ft-ease-overshoot consumer in the family: the check pops
	   past scale(1) and settles, layered on top of (not instead of) the
	   dashoffset draw above — both keyed to the same --ft-duration-micro
	   delay so the pop and the draw read as one gesture. */
	svg[data-state="success"] .ft-statusmorph-check {
		animation: ft-statusmorph-check-pop var(--ft-duration-base, 300ms)
			var(--ft-ease-overshoot, cubic-bezier(0.34, 1.56, 0.64, 1)) var(--ft-duration-micro, 80ms)
			both;
	}

	/* Same draw technique and easing as the check (an arrival, not a
	   departure), staggered one --ft-duration-micro apart so the X reads
	   as two strokes rather than one simultaneous flash. The second
	   stroke's delay is CALCULATED from the same token rather than
	   hardcoded at its default's 160ms: a theme that retunes the token
	   would otherwise start both strokes together at 160ms, or — past
	   that — draw the nominally second stroke first. No second token,
	   deliberately: R11 adds one rung, not two. The 160ms DURATIONS on
	   both lines stay off-scale (a stroke that takes --ft-duration-fast
	   reads slower than the beat between the two), as is the 0.8s spin
	   above: left as literals rather than forced onto a token that would
	   change their value. */
	.ft-statusmorph-cross-a {
		transition: stroke-dashoffset 160ms var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1))
			var(--ft-duration-micro, 80ms);
	}
	.ft-statusmorph-cross-b {
		transition: stroke-dashoffset 160ms var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1))
			calc(var(--ft-duration-micro, 80ms) * 2);
	}
	svg[data-state="error"] {
		animation: ft-statusmorph-shake var(--ft-duration-base, 300ms)
			var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	}
}

@keyframes ft-statusmorph-spin {
	to {
		transform: rotate(360deg);
	}
}
@keyframes ft-statusmorph-check-pop {
	from {
		transform: scale(0.6);
	}
	to {
		transform: scale(1);
	}
}
@keyframes ft-statusmorph-shake {
	0%,
	100% {
		transform: translateX(0);
	}
	25% {
		transform: translateX(-2px);
	}
	75% {
		transform: translateX(2px);
	}
}
</style>
