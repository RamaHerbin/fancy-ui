<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { RevealPresetName, StaggerFrom } from "../../internals/motion/types.js";

// Named so the style object below can compare a caller's value against the
// shipped default and skip the inline write when they match — the same
// technique Pressable's `DEFAULT_SCALE` and Magnetic's `DEFAULT_RADIUS`
// already use. This is what keeps the CSS fallback chain (below) actually
// reachable: an inline style always wins over a stylesheet, so writing these
// vars unconditionally would make `--ft-reveal-duration` etc. un-themeable no
// matter what the CSS said.
// They live in this module block rather than in `<script setup>` because
// `defineProps()` defaults are hoisted out of setup() and cannot reference a
// setup-local binding.
const DEFAULT_DURATION = 600; // tokens.DURATIONS.entrance
const DEFAULT_DELAY = 0;
const DEFAULT_EASING = "cubic-bezier(0.16, 1, 0.3, 1)"; // tokens.EASINGS.out
const DEFAULT_DISTANCE = 16;

export interface RevealProps {
	/** Which of the six directional/scale looks to animate with. */
	preset?: RevealPresetName;
	/** What starts the reveal. `"view"` watches the viewport, `"mount"` fires on the next frame, `"manual"` follows the `active` prop. */
	trigger?: "view" | "mount" | "manual";
	/** Read only when `trigger="manual"` — `true` reveals, `false` re-arms. */
	active?: boolean;
	/** Disconnects the observer after the first reveal. `false` re-arms (and re-hides, unless reduced motion) every time the node leaves the viewport. Only meaningful for `trigger="view"`. */
	once?: boolean;
	/** IntersectionObserver threshold. Only meaningful for `trigger="view"`. */
	threshold?: number;
	/** IntersectionObserver rootMargin. Only meaningful for `trigger="view"`. */
	rootMargin?: string;
	/** Entrance duration in ms. */
	duration?: number;
	/** Delay before the entrance starts, in ms. */
	delay?: number;
	/** CSS easing for the entrance. */
	easing?: string;
	/** Travel distance in px for the four directional presets — ignored by `scale`. */
	distance?: number;
	/** ms per stagger step. `0` (default) animates the root itself; any positive value switches to animating direct element children instead, each offset by its own computed delay. */
	stagger?: number;
	/** Where the stagger counts distance from. Only meaningful when `stagger > 0`. */
	from?: StaggerFrom;
	/** How the very first server-rendered paint looks. `"hidden"` (the default) starts at `data-state="armed"`, so the content is already hidden before hydration and there is no flash — at the cost of staying hidden on a page that never hydrates (the CSS is gated on `(scripting: enabled)`, which reflects the browser, not this page). `"visible"` starts at the pre-mount `"idle"` state, which paints fully visible; the mount effect then flips it to `"armed"` (an instant hide, no fade-out) and the reveal plays from there. Use it for content that must be readable with JS off or on a non-hydrated route, and accept a one-frame flash. See the README's SSR section. */
	initial?: "hidden" | "visible";
	/** The element tag Reveal renders as. */
	as?: keyof HTMLElementTagNameMap;
	/** Fires once per reveal, the moment the state machine reaches `"visible"` — including every re-reveal when `once={false}`. */
	onReveal?: () => void;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useInView } from "../../internals/motion/use-in-view.js";
import { staggerDelay } from "../../internals/motion/stagger.js";
import { STAGGER_CAPS } from "../../internals/motion/tokens.js";

defineOptions({ name: "Reveal", inheritAttrs: false });

const {
	preset = "fade-up",
	trigger = "view",
	active = false,
	once = true,
	threshold = 0.1,
	rootMargin = "0px 0px -10% 0px",
	duration = DEFAULT_DURATION,
	delay = DEFAULT_DELAY,
	easing = DEFAULT_EASING,
	distance = DEFAULT_DISTANCE,
	stagger = 0,
	from = "first",
	initial = "hidden",
	as = "div",
	onReveal,
	class: className,
} = defineProps<RevealProps>();

defineSlots<{
	default(): unknown;
}>();

const attrs = useAttrs();

const el = useTemplateRef<HTMLElement>("el");
defineExpose({ ref: el });

// The 3-state machine (idle → armed → visible) exists so SSR/pre-hydration
// content has a stable, honest name for "nothing has run yet" (idle) that
// is distinct from "the observer is attached and waiting" (armed) — see
// the README's SSR section for why `initial` picks the STARTING value
// here rather than a fixed constant. Only `armed` is hidden by the CSS
// below: `idle` paints visible, which is exactly what `initial="visible"`
// buys (content readable before hydration, with a one-frame flash when
// the mount hook arms it), and `armed` is what `initial="hidden"` starts
// from (no flash, hidden until the reveal fires).
// The read of `initial` here is deliberately one-shot (the starting value
// only); a LATER change to the `initial` prop must not reset an
// already-running reveal back to a pre-mount state.
const state = ref<"idle" | "armed" | "visible">(initial === "hidden" ? "armed" : "idle");

function markVisible() {
	if (state.value !== "visible") {
		state.value = "visible";
		onReveal?.();
	}
}

// Only meaningful for trigger="view" with once=false: drop back to
// "armed" (never all the way to "idle" — idle is a pre-mount-only value)
// so the CSS hidden styling reapplies and a later re-intersection reveals
// again.
//
// Guarded by focus: a keyboard user tabbing through a long, still-visible
// section can land focus inside this node and THEN have it leave the
// viewport underneath them (trigger="view" + once=false) or have
// `active` flip false (trigger="manual") — re-hiding at that moment
// would fade content to opacity:0 with the caret still inside it.
// `handleFocusIn` below only protects a user ARRIVING at hidden content;
// this guard protects one who is already inside when a re-hide would
// otherwise fire. `document` is guarded defensively even though this is
// only ever reached from a browser event/watcher (never during SSR).
function markArmed() {
	const node = el.value;
	if (node && typeof document !== "undefined" && node.contains(document.activeElement)) return;
	state.value = "armed";
}

// Runs exactly once, regardless of any prop changing later — the
// idle→armed flip is a one-time mount bookkeeping step, not something
// that should re-fire (or, worse, re-register as a dependency of a
// watcher that also WRITES `state`, which would just re-run itself
// pointlessly every time `state` changes afterward).
onMounted(() => {
	if (state.value === "idle") state.value = "armed";
});

// trigger="view": the IntersectionObserver path, driven through the
// internals composable rather than the framework-free core. The composable
// takes the NODE, observes only while `enabled`, and owns the `once`
// bookkeeping this component would otherwise duplicate: `once` and
// `onChange` are read fresh on every fire and never rebuild the observer.
// The returned ref is unused — `data-state` is this component's own
// three-state machine, not the observer's boolean.
useInView(el, () => ({
	enabled: trigger === "view",
	once,
	threshold,
	rootMargin,
	onChange: (inViewNow) => {
		if (inViewNow) markVisible();
		else if (!once) markArmed();
	},
}));

// trigger="mount": reveal on the next animation frame after mount, so
// the hidden→visible transition actually has a "from" frame to start
// from instead of painting already-visible on the very first frame.
//
// Split into start/stop and driven from `onMounted` + a watcher rather than
// from one watcher alone: a `flush: 'post'` watcher's FIRST run lands a
// microtask after mount, and Svelte's effect runs during it. The element
// itself is a watch source because Svelte's effect READS `ref` — changing
// `as` swaps the node and re-runs the effect there, so it must re-run here
// too. `framedNode` records the node the pending frame belongs to, which
// makes the watcher's first (post-mount, null→node) run a no-op instead of
// a duplicate start.
let mountFrame: number | undefined;
let mountFrameCancelled = false;
let framedNode: HTMLElement | null = null;

function startMountFrame() {
	const node = el.value;
	if (trigger !== "mount" || !node) return;
	framedNode = node;
	mountFrameCancelled = false;
	mountFrame = requestAnimationFrame(() => {
		mountFrame = undefined;
		if (!mountFrameCancelled) markVisible();
	});
}

function stopMountFrame() {
	mountFrameCancelled = true;
	framedNode = null;
	if (mountFrame !== undefined) {
		cancelAnimationFrame(mountFrame);
		mountFrame = undefined;
	}
}

function syncMountFrame() {
	const wanted = trigger === "mount" ? el.value : null;
	if (wanted === framedNode) return;
	stopMountFrame();
	startMountFrame();
}

onMounted(startMountFrame);
watch([el, () => trigger], syncMountFrame, { flush: "post" });
onBeforeUnmount(stopMountFrame);

// trigger="manual": data-state mirrors `active` directly, every time
// either prop changes. Never re-enters "idle". Run once from `onMounted`
// as well, so a manual reveal mounted with `active` already true is
// visible from the first frame the way Svelte's effect makes it.
// The element is a watch source for the same reason as the mount frame
// above: Svelte's effect reads `ref` (through `markArmed`'s focus guard),
// so an `as`-driven node swap re-runs it there. `manualNode` records the
// node the last run saw, so the watcher's first (post-mount, null→node)
// run is a no-op rather than a second `markArmed()` that would undo a
// focusin reveal.
let manualNode: HTMLElement | null = null;

function syncManual() {
	manualNode = el.value;
	if (trigger !== "manual") return;
	if (active) markVisible();
	else markArmed();
}

onMounted(syncManual);
watch(
	[() => trigger, () => active, el],
	([nextTrigger, nextActive, node], [prevTrigger, prevActive]) => {
		if (node === manualNode && nextTrigger === prevTrigger && nextActive === prevActive) return;
		syncManual();
	},
	{ flush: "post" }
);

// A keyboard user can Tab into content that LOOKS invisible (opacity: 0
// is still focusable — the frozen contract forbids visibility/display
// specifically so hidden content never leaves the tab order). Revealing
// on focusin means hidden content never has to be reached blind. This
// runs regardless of `trigger`, including "manual": if a manual reveal's
// `active` is still false when focus arrives, focusin wins and shows the
// content anyway — there's no accessible reason to make a keyboard user
// wait for an external toggle a mouse user never had to wait for either.
// A caller's own `@focusin` rides in `$attrs` and is bound AFTER this
// handler on the same element, so both run, this one first.
function handleFocusIn() {
	markVisible();
}

// Stagger: only when stagger > 0. Walks the DIRECT ELEMENT children
// (bare text nodes can't carry a CSS custom property) and writes each
// one's computed delay as an inline var, re-indexing whenever the child
// list itself changes (a v-for list growing, for instance) via
// MutationObserver — a static :nth-child sheet (see blur-reveal, this
// component's predecessor) can never do this for an arbitrary/changing
// child count.
//
// `SVGElement` is accepted alongside `HTMLElement` because the stagger CSS
// below targets EVERY direct element child (`> *`): a row of bare `<svg>`
// icons is a real, common case, and an `instanceof HTMLElement`-only walk
// would animate each icon (the CSS matched) while leaving every one of
// them on the 0ms fallback delay — the whole row arriving at once. Both
// interfaces expose `style`, which is all this needs.
let staggerObserver: MutationObserver | undefined;
let staggerRoot: HTMLElement | undefined;
// The (node, step, origin) triple the current walk was started for — the
// watcher below re-runs the walk only when one of them actually changed,
// so its first (post-mount, null→node) run does not restart what
// `onMounted` just started.
let staggerStep = 0;
let staggerOrigin: StaggerFrom = "first";

function applyStagger(root: HTMLElement, step: number, origin: StaggerFrom) {
	const kids = Array.from(root.children).filter(
		(child): child is HTMLElement | SVGElement =>
			(child instanceof HTMLElement || child instanceof SVGElement) &&
			!child.hasAttribute("data-reveal-skip")
	);
	for (const [i, kid] of kids.entries()) {
		const ms = staggerDelay(i, kids.length, step, origin, STAGGER_CAPS.item);
		kid.style.setProperty("--ft-reveal-child-delay", `${ms}ms`);
	}
}

function startStagger() {
	const root = el.value;
	staggerStep = stagger;
	staggerOrigin = from;
	if (stagger <= 0 || !root) return;
	const step = stagger;
	const origin = from;
	staggerRoot = root;
	applyStagger(root, step, origin);
	staggerObserver = new MutationObserver(() => applyStagger(root, step, origin));
	staggerObserver.observe(root, { childList: true });
}

function stopStagger() {
	if (!staggerObserver) return;
	staggerObserver.disconnect();
	staggerObserver = undefined;
	const root = staggerRoot;
	staggerRoot = undefined;
	if (!root) return;
	// Stagger dropping back to 0 (or the component unmounting) leaves this
	// var behind otherwise — harmless today (the CSS above only reads it
	// under `[data-stagger]`), but it's state this component wrote and no
	// longer owns once the walk that set it tears down.
	for (const child of Array.from(root.children)) {
		if (child instanceof HTMLElement || child instanceof SVGElement) {
			child.style.removeProperty("--ft-reveal-child-delay");
		}
	}
}

// `el` is a watch source because Svelte's effect reads `ref`: changing
// `as` swaps the element, and the walk has to move to the new node (the
// old one keeps the cleanup that strips its vars, exactly as Svelte's
// effect cleanup closes over the old `root`) or the new children would
// never get a delay and the MutationObserver would stay bound to a
// detached node.
function syncStagger() {
	const wanted = stagger > 0 ? el.value : null;
	if (wanted === (staggerRoot ?? null) && stagger === staggerStep && from === staggerOrigin) return;
	stopStagger();
	startStagger();
}

onMounted(startStagger);
watch([el, () => stagger, () => from], syncStagger, { flush: "post" });
onBeforeUnmount(stopStagger);

// Written only when the caller's value differs from the shipped default —
// see the DEFAULT_* comment above. Folded into the `$attrs` spread rather
// than bound as a separate `:style` so that, at default props, NO style
// attribute is emitted at all: Svelte's `style:` directives write nothing
// there either, while `:style="{}"` still renders `style=""`. The vars sit
// AFTER a caller's own `style` in the merged array, so they win it, matching
// Svelte's style: directives beating the style attribute.
const rootAttrs = computed(() => {
	const vars: Record<string, string> = {};
	if (duration !== DEFAULT_DURATION) vars["--ft-reveal-duration"] = `${duration}ms`;
	if (delay !== DEFAULT_DELAY) vars["--ft-reveal-delay"] = `${delay}ms`;
	if (easing !== DEFAULT_EASING) vars["--ft-reveal-easing"] = easing;
	if (distance !== DEFAULT_DISTANCE) vars["--ft-reveal-distance"] = `${distance}px`;
	if (Object.keys(vars).length === 0) return attrs;
	const { style, ...rest } = attrs as Record<string, unknown> & { style?: unknown };
	return { ...rest, style: [style, vars] };
});
</script>

<template>
	<component
		:is="as"
		ref="el"
		:class="cn('ft-reveal', className)"
		@focusin="handleFocusIn"
		v-bind="rootAttrs"
		:data-state="state"
		:data-preset="preset"
		:data-stagger="stagger > 0 ? '' : undefined"
	>
		<slot />
	</component>
</template>

<style scoped>
/*
	 * Composed once here (rather than inline per data-preset selector below)
	 * so both the root path (stagger=0) and the per-child path (stagger>0)
	 * read the exact same formula — a custom property is inherited, so a
	 * staggered child picks this up straight from its parent without
	 * needing its own copy. The tx/ty/scale sign vars are plain data (see
	 * the data-preset rules right below) and stay defined outside the
	 * reduced-motion query on purpose: they do nothing on their own, so
	 * there's nothing to gate.
	 */
.ft-reveal {
	--ft-reveal-hidden-transform: translate(
			calc(var(--ft-reveal-tx, 0) * var(--ft-reveal-distance, 16px)),
			calc(var(--ft-reveal-ty, 0) * var(--ft-reveal-distance, 16px))
		)
		scale(var(--ft-reveal-scale, 1));
}

/* Signs mirror internals/motion/presets.ts's PRESETS table exactly —
	   "fade" sets none of these (no transform term at all, matching
	   preset()'s own cssFor(), which never emits a no-op `transform: none`
	   for fade either). */
.ft-reveal[data-preset="fade-up"] {
	--ft-reveal-ty: 1; /* PRESETS["fade-up"].y */
}
.ft-reveal[data-preset="fade-down"] {
	--ft-reveal-ty: -1; /* PRESETS["fade-down"].y */
}
.ft-reveal[data-preset="fade-left"] {
	--ft-reveal-tx: 1; /* PRESETS["fade-left"].x */
}
.ft-reveal[data-preset="fade-right"] {
	--ft-reveal-tx: -1; /* PRESETS["fade-right"].x */
}
.ft-reveal[data-preset="scale"] {
	--ft-reveal-scale: 0.92; /* PRESETS.scale.scale — fixed, no matching prop */
}

/*
	 * Hidden styling exists ONLY here: a user who prefers reduced motion, or
	 * whose browser reports no scripting capability at all, never has this
	 * rule apply — the resting (visible, untransformed) state is always the
	 * fallback, never something JS has to force. `visibility`/`display` are
	 * deliberately never used (see the frozen contract) so hidden content
	 * stays reachable by Tab — see `handleFocusIn` above.
	 */
@media (prefers-reduced-motion: no-preference) and (scripting: enabled) {
	/* Root path (stagger=0): the root itself is the thing that animates.
		   Only `armed` hides. `idle` (the `initial="visible"` server paint)
		   stays visible, and the transition is declared on the `visible`
		   state alone so the mount-time idle→armed flip snaps instantly
		   instead of fading content out over the entrance duration. */
	.ft-reveal:not([data-stagger])[data-state="armed"] {
		opacity: 0;
		transform: var(--ft-reveal-hidden-transform);
	}
	.ft-reveal:not([data-stagger])[data-state="visible"] {
		transition-property: opacity, transform;
		transition-duration: var(
			--ft-reveal-duration,
			var(--ft-duration-entrance, 600ms)
		); /* tokens.DURATIONS.entrance */
		transition-timing-function: var(
			--ft-reveal-easing,
			var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1))
		); /* tokens.EASINGS.out */
		transition-delay: var(--ft-reveal-delay, 0ms);
	}

	/* Stagger path (stagger>0): the root stays static (no opacity/transform
		   of its own — see the "double-animation" note in the Wave-1 audit)
		   and each direct element child animates on its own, offset by
		   --ft-reveal-child-delay (written per child by the watcher above).
		   data-reveal-skip opts a child out entirely. */
	.ft-reveal[data-stagger][data-state="armed"] > :deep(*:not([data-reveal-skip])) {
		opacity: 0;
		transform: var(--ft-reveal-hidden-transform);
	}
	.ft-reveal[data-stagger][data-state="visible"] > :deep(*:not([data-reveal-skip])) {
		transition-property: opacity, transform;
		transition-duration: var(
			--ft-reveal-duration,
			var(--ft-duration-entrance, 600ms)
		); /* tokens.DURATIONS.entrance */
		transition-timing-function: var(
			--ft-reveal-easing,
			var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1))
		); /* tokens.EASINGS.out */
		transition-delay: calc(var(--ft-reveal-delay, 0ms) + var(--ft-reveal-child-delay, 0ms));
	}
}
</style>
