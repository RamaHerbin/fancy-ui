<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { StaggerFrom } from "../../internals/motion/types.js";

/**
 * Props for TextRoll.
 *
 * The text to display. A change after mount triggers a per-grapheme roll to
 * the new value. TextRoll has no `trigger` prop of its own (unlike Reveal) —
 * it only ever reacts to `value` changing, so the very first render is
 * always a plain, non-animated real-layer text node.
 */
export interface TextRollProps {
	value: string;
	/**
	 * Which way the cells travel. `"auto"` compares the trimmed old and new
	 * values as numbers and rolls up for an increase, down for a decrease; a
	 * non-numeric change, a tie, or an empty side falls back to `"up"`.
	 */
	direction?: "auto" | "up" | "down";
	/** Roll duration in ms. Collapsed to `0` under
	 * `prefers-reduced-motion: reduce` (synchronous swap). */
	duration?: number;
	/** Per-cell stagger step in ms, before compression — see
	 * `STAGGER_CAPS.text` (200ms total). Collapsed to `0` under reduced
	 * motion, same as `duration`. */
	stagger?: number;
	/** Stagger origin, forwarded to the shared `staggerDelay` helper. */
	from?: StaggerFrom;
	/** `font-variant-numeric: tabular-nums` on BOTH layers (must be both, or
	 * the two layers stop being the same width) — locks digit advance width,
	 * primarily useful alongside a numeric `direction="auto"` ticker. Does
	 * not fix general alignment risk for non-digit text. */
	tabular?: boolean;
	/**
	 * Off by default: a live region firing on every tick of a fast counter
	 * is worse than silence. `"polite"`/`"assertive"` put the matching
	 * `role` + `aria-live` pair on the real (unsplit) text layer only — the
	 * cell layer stays `aria-hidden` in every state, so assistive tech never
	 * gets fragmented per-grapheme spam.
	 */
	live?: "off" | "polite" | "assertive";
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import {
	computed,
	onBeforeUnmount,
	onBeforeUpdate,
	onMounted,
	ref,
	useAttrs,
	mergeProps,
	useTemplateRef,
	watch,
} from "vue";
import { cn } from "../../utils.js";
import { runTransition } from "../../internals/motion/animate.js";
import { createReducedMotion } from "../../internals/motion/media-query.js";
import { DURATIONS, STAGGERS, STAGGER_CAPS } from "../../internals/motion/tokens.js";
import { rollIn, rollOut } from "./roll-transitions.js";

defineOptions({ name: "TextRoll", inheritAttrs: false });

const {
	value,
	direction = "auto",
	duration = DURATIONS.base,
	// Same rationale as `DEFAULT_DURATION` above: `STAGGERS.char` IS
	// TextRoll's per-grapheme step (that key's own comment in `tokens.ts`
	// says so) — not a second `15` that could silently drift from it.
	stagger = STAGGERS.char,
	from = "first",
	tabular = false,
	live = "off",
	class: className,
} = defineProps<TextRollProps>();

const attrs = useAttrs();

// The prop default IS the token, not a second hardcoded `300` that could
// drift from it — `tokens.ts` is the one place these numbers live (see its
// own header comment). Kept as its own binding (not inlined into the
// destructure default above, which cannot reference a locally declared
// variable) so the template's conditional var write below compares against
// the exact same value.
const DEFAULT_DURATION = DURATIONS.base;

const rootRef = useTemplateRef<HTMLSpanElement>("root");
defineExpose({ ref: rootRef });

/**
 * Grapheme splitting. `Intl.Segmenter` groups combining marks and
 * ZWJ-joined emoji into ONE cluster each (`Array.from`/code-unit splitting
 * does not — it breaks "café"'s composed `é` into `e` + a detached accent,
 * and shreds a ZWJ family emoji into seven broken pieces); when the API is
 * unavailable the string is not split at all — one cell, the whole value
 * crossfades as a unit — never a code-unit fallback that would silently
 * corrupt those cases. Checked fresh on every call (never cached at module
 * scope) so a test can delete `Intl.Segmenter` and see the fallback take
 * effect on the very next render.
 */
function segmentGraphemes(text: string): string[] {
	if (typeof Intl.Segmenter !== "function") return [text];
	const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
	const graphemes: string[] = [];
	for (const { segment } of segmenter.segment(text)) graphemes.push(segment);
	return graphemes;
}

/**
 * `direction="auto"` resolution. Guards the classic `Number("") === 0`
 * footgun explicitly: an empty trimmed side never resolves through the
 * numeric branch, so clearing a field never reads as "counted down to
 * nothing".
 */
function resolveDirection(
	prev: string,
	next: string,
	requested: "auto" | "up" | "down"
): "up" | "down" {
	if (requested !== "auto") return requested;
	const p = prev.trim();
	const n = next.trim();
	if (p !== "" && n !== "") {
		const pn = Number(p);
		const nn = Number(n);
		if (Number.isFinite(pn) && Number.isFinite(nn) && pn !== nn) return nn > pn ? "up" : "down";
	}
	return "up";
}

const reduced = createReducedMotion();
onMounted(() => {
	const stop = reduced.start();
	onBeforeUnmount(stop);
});

// Reduced motion collapses BOTH knobs. `effDuration` is what actually
// disables the roll: the transition sampler (`runTransition`)
// short-circuits synchronously BEFORE it ever reads `delay` or calls
// `element.animate` when `duration` is `0`, so a non-zero stagger next to a
// zero duration could never produce a staggered sequence of its own.
// Collapsing `effStagger` too is defensive belt-and-braces — correct, and
// keeps this component honest if that short-circuit ever changes — not the
// mechanism that makes reduced motion synchronous.
const effDuration = computed(() => (reduced.current ? 0 : duration));
const effStagger = computed(() => (reduced.current ? 0 : stagger));

const graphemes = computed(() => segmentGraphemes(value));

// `generation` is the mechanism behind "same length ⇒ minimal diff,
// different length ⇒ safe full re-roll": every cell's key is prefixed with
// it, so leaving it unchanged lets an untouched `${index}:${grapheme}`
// position keep its DOM node (Vue's own keyed `v-for` reconciliation IS the
// diff — no custom algorithm needed), while bumping it forces EVERY key to
// change at once, even ones that would otherwise coincidentally still
// match. That second case matters because a positional-alignment heuristic
// across a length change is guessable but wrong in general (a
// trailing-zero append like "4.5"→"4.50" would break a right-edge heuristic
// badly) — a full reroll is the honest fallback.
const generation = ref(0);
const resolvedDirection = ref<"up" | "down">(direction === "auto" ? "up" : direction);
const inFlight = ref(0);
const rollState = computed(() => (inFlight.value > 0 ? "rolling" : "idle"));

const cells = computed(() =>
	graphemes.value.map((grapheme, index) => ({
		key: `${generation.value}:${index}:${grapheme}`,
		grapheme,
		index,
	}))
);

function beginTransition() {
	inFlight.value += 1;
}
function endTransition() {
	inFlight.value = Math.max(0, inFlight.value - 1);
}

// The direction BOTH legs of a roll animate with — deliberately a snapshot
// of `resolvedDirection`, not a read of it.
//
// In the source the transitions read the `resolvedDirection` signal live, at
// the moment the block effect starts them — which is BEFORE the component's
// own `$effect`s for that flush (they are registered last and run last). So
// the roll a value change starts animates with the direction resolved by the
// PREVIOUS change, while `data-direction` catches up in the same flush; a
// LATER roll in a later flush (the generation bump's full re-roll on a
// length change) then reads the already-updated value. That lag is what
// `roll-transitions.ts` means by "the enter and leave legs on the SAME roll
// always receive the same direction": the pair is coherent because both read
// ONE value, not because that value is the freshest one.
//
// Vue's phases split the pair if the legs read the ref directly: a leave hook
// runs synchronously inside the patch (still the old value) while an enter
// hook is queued as a post effect during that same patch — i.e. after the
// post-flush watcher below, which was queued earlier still (while props were
// updated, before the render). Leave would get the old direction and enter
// the new one, and a roll whose two glyphs travel the same way is a parallel
// slide, not an odometer turn.
//
// `onBeforeUpdate` is the phase that reproduces the source exactly: it runs
// once per re-render, after props are updated but before the render and the
// patch that start that render's transitions, and before the post-flush
// watcher that resolves the new direction. Every roll therefore animates
// with the value `resolvedDirection` held going INTO the render that created
// it — old for the value change's own roll, new for the generation bump's.
let legDirection: "up" | "down" = resolvedDirection.value;
onBeforeUpdate(() => {
	legDirection = resolvedDirection.value;
});

// Two SEPARATE watchers, not one — deliberately. `resolvedDirection` needs
// to react to `direction` alone (an explicit prop flip must update
// `data-direction` even with no new `value`); the generation/backstop
// bookkeeping below must NOT react to `direction` alone, or a
// `direction`-only change would silently cancel an in-flight roll's
// backstop. That second requirement is met by this watcher never reading
// `direction` in the first place — it only watches `value`, so a
// `direction`-only change never re-runs it (and therefore never tears down
// its already-armed timer).
//
// Neither watcher runs on mount (no `immediate`), the counterpart of the
// source's own first-run bootstrap that captures a prior value and returns
// without doing anything.

// Watcher 1: `resolvedDirection`.
let priorValueForDirection = value;
watch(
	[() => value, () => direction],
	([nextValue, requested]) => {
		resolvedDirection.value = resolveDirection(priorValueForDirection, nextValue, requested);
		priorValueForDirection = nextValue;
	},
	{ flush: "post" }
);

// Watcher 2: generation bump + the hard timeout backstop. Watches ONLY
// `value` — never `direction`, and never `effDuration` (read plainly below,
// outside any tracked source — a watch callback body is untracked by
// construction, the counterpart of the source's own `untrack`) — for the
// reason above.
let priorLength = graphemes.value.length;
watch(
	() => value,
	(_nextValue, _prevValue, onCleanup) => {
		const nextLength = graphemes.value.length;

		if (nextLength !== priorLength) generation.value += 1;
		priorLength = nextLength;

		// Unconditional backstop: whatever happens to the per-cell
		// enter/leave hooks below — an interrupted transition, dropped by
		// ANOTHER value arriving mid-roll, may never fire its end callback —
		// this roll is guaranteed to read "idle" again. `DURATIONS.entrance`
		// (600ms) is the floor this contract names and is exactly what a
		// default-duration roll — or a reduced-motion one, where
		// `effDuration` is `0` — needs; a longer `duration` plus the
		// worst-case stagger spread (`STAGGER_CAPS.text`) can legitimately
		// run past that floor, and a backstop that fires before the roll it
		// is meant to safety-net has even finished would cut the animation
		// itself, so the budget grows past 600ms rather than silently
		// truncating a caller's own `duration`. `DURATIONS.fast` is slack
		// for the delay-then-animate double `element.animate()` call the
		// sampler makes. The cleanup clears this timer both on the NEXT
		// value change (re-arming a fresh window rather than trusting
		// whatever was left on the old one) and on unmount.
		const backstopMs = Math.max(
			DURATIONS.entrance,
			effDuration.value + STAGGER_CAPS.text + DURATIONS.fast
		);
		const timeoutId = setTimeout(() => {
			inFlight.value = 0;
		}, backstopMs);

		onCleanup(() => clearTimeout(timeoutId));
	},
	{ flush: "post" }
);

const liveRole = computed(() => (live === "off" ? undefined : live === "polite" ? "status" : "alert"));
const liveAriaLive = computed(() => (live === "off" ? undefined : live));

// The style analogue of PORTING.md's documented empty-class trap: Vue
// normalises an object `:style` whose every value is `undefined` to `""` and
// still writes `style=""` (SSR renders the attribute unconditionally wherever
// the element carries a `:style` binding at all), while the source's `style:`
// directives emit no attribute. `:style="undefined"` does NOT avoid it —
// measured; only the documented `v-bind="cond ? { … } : {}"` shape, which
// leaves the key off the props object entirely, omits the attribute.
//
// The root already spends its one allowed `v-bind` on `attrs` (an element may
// carry only one), so it merges the conditional style in through `mergeProps`
// — the exact call the template compiler would have emitted for two bindings,
// so a consumer-supplied `style` in `attrs` still merges rather than being
// clobbered, and an unset duration leaves no `style` key at all.
const rootBind = computed(() =>
	mergeProps(
		attrs,
		duration === DEFAULT_DURATION ? {} : { style: { "--ft-textroll-duration": `${duration}ms` } }
	)
);
const layerBind = computed(() => (tabular ? { style: { fontVariantNumeric: "tabular-nums" } } : {}));

function cellIndexOf(el: Element): number {
	return Number.parseInt((el as HTMLElement).style.gridColumnStart, 10) - 1;
}

function onCellEnter(el: Element, done: () => void) {
	beginTransition();
	const spec = rollIn(el, {
		direction: legDirection,
		duration: effDuration.value,
		index: cellIndexOf(el),
		count: graphemes.value.length,
		step: effStagger.value,
		from,
	});
	runTransition(el, spec, 1, undefined, () => {
		endTransition();
		done();
	});
}

function onCellLeave(el: Element, done: () => void) {
	beginTransition();
	const spec = rollOut(el, {
		direction: legDirection,
		duration: effDuration.value,
		index: cellIndexOf(el),
		count: graphemes.value.length,
		step: effStagger.value,
		from,
	});
	runTransition(el, spec, 0, undefined, () => {
		endTransition();
		done();
	});
}
</script>

<template>
	<span
		ref="root"
		v-bind="rootBind"
		:class="cn('ft-textroll', className)"
		:data-state="rollState"
		:data-direction="resolvedDirection"
	>
		<span
			class="ft-textroll-real"
			v-bind="layerBind"
			:role="liveRole"
			:aria-live="liveAriaLive"
			>{{ value }}</span
		><TransitionGroup
			tag="span"
			class="ft-textroll-cells"
			aria-hidden="true"
			v-bind="layerBind"
			:css="false"
			@enter="onCellEnter"
			@leave="onCellLeave"
			><span
				v-for="cell in cells"
				:key="cell.key"
				class="ft-textroll-cell"
				:style="{ gridColumnStart: cell.index + 1 }"
				>{{ cell.grapheme }}</span
			></TransitionGroup
		>
	</span>
</template>

<style scoped>
/*
 * `inline-grid` stacks both layers on the SAME grid area, so the implicit
 * track sizes to `max-content` across both — the box is exactly as wide as
 * the wider layer, no manual width-matching CSS needed, provided both
 * layers shape identically (see the README's "supported scope" section for
 * where that assumption breaks and why it degrades safely). `white-space:
 * pre` is set ONCE here — it is inherited, so both children get it without
 * repeating the declaration, and critically both layers then collapse
 * whitespace by the IDENTICAL rule: a space grapheme rendered in its own
 * isolated cell (see `.ft-textroll-cell` below) is at the start AND end of
 * that cell's own inline formatting context, so under `nowrap` (which still
 * collapses) it would be trimmed to zero width, while the real layer's
 * single text node collapses the same run of whitespace consistently —
 * `pre` (preserve) is what keeps both layers agreeing on width for any
 * number of consecutive spaces. `pre` still implies no-wrap (single line,
 * unchanged), but it DOES preserve a literal `\n` as a forced break —
 * `value` must not contain newlines (see the README's "Supported scope").
 */
.ft-textroll {
	display: inline-grid;
	white-space: pre;
	/* tokens.DURATIONS.base — this var is NOT read by anything in this file:
	   the roll itself is JS/WAAPI-driven (roll-transitions.ts reads
	   `duration` as a plain number, not this CSS var). It exists purely as a
	   public theming/introspection hook, matching the family-wide
	   `--ft-<compact>-duration` convention, for a consumer's own CSS that
	   wants to stay in sync with the configured duration. */
	--ft-textroll-duration: var(--ft-duration-base, 300ms);
}

.ft-textroll-real {
	grid-area: 1 / 1;
}

/* aria-hidden, inert-by-CSS: never selectable, never hit-testable, and
   invisible at rest — only the real layer above is authoritative except for
   the roll's own brief window (see [data-state="rolling"] below). A NESTED
   grid, not plain flow: `.ft-textroll-cell` pins BOTH its column (via
   `grid-column-start`, by index) AND its row (`grid-row: 1`, below)
   explicitly, so a leaving and an entering cell for the SAME grapheme
   position are fully co-located and deliberately overlap in one grid cell
   instead of sitting side by side in normal flow for the whole roll window.
   The latter is what used to widen this layer's box — and the root's
   `max-content` track with it — on every value change: a leaving element is
   kept in the DOM, in flow, until its leave transition completes, so the
   departing and arriving glyph were both present as ordinary flow siblings.
   `align-items: baseline` keeps the row aligned now that cells are
   blockified grid items rather than inline-block siblings on one text
   line. */
.ft-textroll-cells {
	grid-area: 1 / 1;
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: max-content;
	align-items: baseline;
	justify-content: start;
	user-select: none;
	pointer-events: none;
	opacity: 0;
}

/* `overflow: hidden` does NOT make a cell's `translateY` read as "rolling
   into/out of a slot" — the transition is applied to the cell itself, so
   its clip box travels WITH the glyph and there is nothing left inside the
   cell to mask against a static slot. Kept per contract anyway, for what it
   actually buys: it clips glyph overhang at the transform's extremes, and
   it is what makes an inline-block synthesize its baseline from its bottom
   margin edge rather than the glyph's own text baseline. `grid-row: 1` pins
   every cell to the single row that exists (see `.ft-textroll-cells` above)
   so that two cells sharing one `grid-column-start` — set inline, per cell,
   in the markup — are fully explicit on BOTH axes and therefore
   intentionally overlap instead of the grid's auto-placement pushing the
   second one to a row of its own to avoid a collision it would otherwise
   assume was unintended. */
.ft-textroll-cell {
	display: inline-block;
	grid-row: 1;
	overflow: hidden;
}

/*
 * The layer swap itself — not an animation, a discrete state change — is
 * still gated behind `no-preference` on purpose: under reduced motion the
 * cells layer must never become visible at all (there is nothing to roll),
 * so the resting styles above stay in force unconditionally and the real
 * layer — always showing the current `value` — is what a reduced-motion
 * user sees update, instantly, with no transparent frame in between.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-textroll[data-state="rolling"] .ft-textroll-real {
		color: transparent;
	}

	.ft-textroll[data-state="rolling"] .ft-textroll-cells {
		opacity: 1;
	}
}

/* Forced-colors mode (Windows High Contrast) forces `color` to a system
   color on any element left at the default `forced-color-adjust: auto` —
   only `opacity` and `background-color: transparent` pass through
   untouched. That means the real layer's `color: transparent` above is
   already going to be overridden by the UA during a roll (stating it
   explicitly here as `CanvasText` is just naming that outcome rather than
   leaving it to an implicit default). `opacity` is NOT forced, though, so
   without the second rule below a high-contrast user would see the cell
   layer's stale glyphs painted on top of the now-visible real layer for the
   whole roll window — this degrades to the reduced-motion outcome instead:
   an instant swap, cell layer never shown. Same (0, 2, 0) specificity as the
   `no-preference` block above, placed after it, so source order alone
   decides without `!important`. */
@media (forced-colors: active) {
	.ft-textroll[data-state="rolling"] .ft-textroll-real {
		color: CanvasText;
	}

	.ft-textroll[data-state="rolling"] .ft-textroll-cells {
		opacity: 0;
	}
}
</style>
