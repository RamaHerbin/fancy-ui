<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { ButtonVariant, ButtonSize } from "./types.js";

export interface ButtonProps {
	/** Visual treatment. */
	variant?: ButtonVariant;
	/** Padding / font-size / radius scale. */
	size?: ButtonSize;
	/** Native `type`. Ignored once `href` is set — an anchor has no `type`. */
	type?: "button" | "submit" | "reset";
	/** Greys the button out and makes it inert to pointer and keyboard activation. */
	disabled?: boolean;
	/**
	 * Swaps `iconStart` for a spinner and marks the control `aria-busy`, without
	 * dimming it the way `disabled` does — the button still reads as "working",
	 * not "unavailable". Activation is blocked exactly like `disabled`.
	 */
	loading?: boolean;
	/** Renders an `<a>` instead of a `<button>` when set. */
	href?: string;
	/** Anchor `target`. `"_blank"` forces a safe `rel` regardless of what `rel` says. */
	target?: string;
	/** Anchor `rel`. Widened, never narrowed — see `target`. */
	rel?: string;
	/** Stretches the button to fill its container's width. */
	fullWidth?: boolean;
	/** Accessible name for a button whose content is icon-only. */
	label?: string;
	/** Fires on activation. Never called while `disabled` or `loading`. `@click` reaches it. */
	onClick?: ((event: MouseEvent) => void) | ((event: MouseEvent) => void)[];
	/** @deprecated Use `@click` / `onClick`. Only called when `onClick` is absent. */
	onclick?: ((event: MouseEvent) => void) | ((event: MouseEvent) => void)[];
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the `hover` cue on mouse/pen pointer enter and the `press` cue on
	 * click. Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { callListener } from "../../internals/call-listener.js";
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useSoundFeedback } from "../../sound/use-sound-feedback.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { linear } from "../../internals/motion/easing.js";
import { runTransition, type TransitionRun } from "../../internals/motion/animate.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";

defineOptions({ name: "Button", inheritAttrs: false });

const {
	variant = "primary",
	size = "md",
	type = "button",
	disabled = false,
	loading = false,
	href = undefined,
	target = undefined,
	rel = undefined,
	fullWidth = false,
	label = undefined,
	onClick,
	onclick,
	class: className,
	sound = false,
} = defineProps<ButtonProps>();

// Every attribute and listener that is not a declared prop lands on the
// rendered `<button>` / `<a>`, spread BEFORE the attributes this component
// manages so a consumer can add to them but never break them. `onClick` is a
// declared prop, so it runs once through the guard in `handleClick`; the
// modified forms (`@click.once`, `.capture`, `.passive`) compile to
// `onClickOnce` / `onClickCapture` / `onClickPassive` and would bind straight
// to the element past that guard, so they are dropped while the button is inert.
//
// A plain function called from the template, never a `computed`: the
// `useAttrs()` proxy only tracks on a property GET, so a computed built while
// `attrs` was empty would never see an attribute the parent adds later. A
// parent-driven attrs change always re-renders this component.
const attrs = useAttrs();
function forwarded() {
	const blocked = disabled || loading;
	if (!blocked && !href) return attrs;
	// On the link branch `auxclick` runs once through `handleAuxClick` (internal
	// guard first, then the consumer's listener); its modified forms are dropped
	// while the link is blocked, like the click ones.
	return Object.fromEntries(
		Object.entries(attrs).filter(
			([key]) =>
				!(blocked && /^onClick/.test(key)) &&
				!(href && (/^onAuxclick$/i.test(key) || (blocked && /^onAuxclick/i.test(key))))
		)
	);
}
type AriaFlag = boolean | "true" | "false" | undefined;

defineSlots<{
	/** The button's label / content. */
	default?: () => unknown;
	/** Rendered before the label. Replaced by the spinner while `loading`. */
	iconStart?: () => unknown;
	/** Rendered after the label. */
	iconEnd?: () => unknown;
}>();

const el = useTemplateRef<HTMLButtonElement | HTMLAnchorElement>("el");
defineExpose({ ref: el });

const SIZE_CLASSES: Record<ButtonSize, string> = {
	sm: "rounded-[6px] px-[12px] py-[5px] text-[12px]",
	md: "rounded-[8px] px-[18px] py-[9px] text-[13px]",
	lg: "rounded-[10px] px-[24px] py-[12px] text-[14px]",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	primary: "bg-primary text-primary-foreground hover:bg-primary/90",
	secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
	outline: "border border-border text-foreground hover:bg-accent hover:text-accent-foreground",
	ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
	// Colour lives in the scoped style block: the brand purple has no semantic
	// Tailwind token, so it is a family-level CSS custom property instead.
	accent: "ft-btn--accent",
	destructive:
		"border border-destructive/35 bg-destructive/10 text-[oklch(0.48_0.21_27.325)] dark:text-destructive hover:bg-destructive/20",
};

const classes = computed(() =>
	cn(
		"ft-btn",
		"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
		// No `transition-colors` here: the scoped style block below declares a
		// `transition` shorthand on this same element (it has to, so the press
		// scale can join the colour channel under `prefers-reduced-motion:
		// no-preference`), and a scoped block is unlayered while Tailwind's
		// utilities sit in `@layer utilities` — the utility would lose silently
		// and read as a colour transition that never ran. The colour channel is
		// re-declared by hand at exactly the values it resolved to.
		"cursor-pointer",
		"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ft-btn-accent)]/35",
		// `data-disabled` covers the anchor branch, which has no native `:disabled`
		// pseudo-class to hang the same dimmed treatment off. It tracks `disabled`
		// alone, never `loading` — `aria-disabled` also goes true while loading (see
		// `anchorBlocked` below), but the mockup's loading swatch is explicitly not
		// dimmed, so the visual hook and the a11y attribute must stay two different
		// things even though they overlap when `disabled` is set.
		"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
		"data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
		SIZE_CLASSES[size],
		VARIANT_CLASSES[variant],
		fullWidth && "w-full",
		className
	)
);

// `target="_blank"` without `noopener` lets the opened page reach back into
// this one via `window.opener`; a caller-supplied `rel` is widened rather
// than trusted, so the safe tokens are always present even if they forgot.
const resolvedRel = computed(() => {
	if (target !== "_blank") return rel;
	const tokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
	tokens.add("noopener");
	tokens.add("noreferrer");
	return [...tokens].join(" ");
});

// An <a> has no native `disabled` state. `disabled` strips `href`/`target`
// and leaves the tab order (nothing to activate, nothing to read). `loading`
// is different: the control is busy, not unavailable, so it keeps its `href`
// and its tab stop — focus must not vanish under a keyboard user mid-request —
// and activation is blocked in the handlers instead (`click` for keyboard and
// primary pointer, `auxclick` for middle-click). `aria-busy` + `aria-disabled`
// tell assistive tech why nothing happens.
const anchorInert = computed(() => disabled);
const anchorBlocked = computed(() => disabled || loading);

// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
// off (and never the default click → press, which `handleClick` already plays).
useSoundFeedback(el, () => ({
	on: sound ? { pointerenter: "hover" as const } : ({} as Record<string, never>),
	disabled: anchorBlocked.value,
}));

// The one duration the lead slot's cross-fade runs on: `DURATIONS.micro`, the
// glyph-scale rung, collapsed to 0 when the user has asked for less motion —
// at 0 `runTransition` skips `element.animate()` entirely and the swap is
// synchronous, which is the same behaviour this button had before the fade
// existed.
//
// Deliberately a plain function, never a `computed`: `prefersReducedMotion()`
// resolves `window.matchMedia` fresh on every call and its own contract
// (`internals/motion/anchored.ts`) forbids reading it from a `computed`,
// where the answer would be cached once and then never revisited. A
// transition spec is built once per leg, at the instant that leg starts —
// exactly the call site that contract sanctions.
function leadFade() {
	return prefersReducedMotion() ? 0 : DURATIONS.micro;
}

// The stock opacity fade, built fresh at the start of every leg: read the
// node's live computed opacity, then interpolate `opacity: t * o` linearly.
// The two halves of the swap are DIFFERENT elements, so neither leg ever
// reverses into the other and there is nothing to memoise across legs.
function leadFadeSpec(node: Element): TransitionSpec {
	const o = +getComputedStyle(node).opacity;
	return {
		delay: 0,
		duration: leadFade(),
		easing: linear,
		css: (t: number) => `opacity: ${t * o}`,
	};
}

// One run per node, so a cancelled leg can be aborted from the matching
// `*-cancelled` hook rather than left holding `fill: forwards` on a node the
// transition no longer owns.
const leadRuns = new WeakMap<Element, TransitionRun>();

function leadEnter(node: Element, done: () => void) {
	leadRuns.set(node, runTransition(node, leadFadeSpec(node), 1, undefined, done));
}

function leadLeave(node: Element, done: () => void) {
	leadRuns.set(node, runTransition(node, leadFadeSpec(node), 0, undefined, done));
}

function leadCancelled(node: Element) {
	leadRuns.get(node)?.abort();
	leadRuns.delete(node);
}

// The single guard both branches funnel through. A native `disabled` button
// already refuses real pointer/keyboard input, but a synthetic `.click()` (or
// an anchor, which has no disabled state at all) walks straight past that —
// this is what actually keeps the callback from firing.
function handleAuxClick(event: MouseEvent) {
	if (disabled || loading) {
		event.preventDefault();
		return;
	}
	callListener((attrs.onAuxclick ?? attrs.onAuxClick) as never, event);
}

function handleClick(event: MouseEvent) {
	if (disabled || loading) {
		event.preventDefault();
		return;
	}
	if (sound) soundFx.play("press");
	callListener(onClick ?? onclick, event);
}
</script>

<template>
	<a
		v-if="href"
		ref="el"
		v-bind="forwarded()"
		:class="classes"
		:href="anchorInert ? undefined : href"
		:target="anchorInert ? undefined : target"
		:rel="resolvedRel"
		:aria-label="label ?? (attrs['aria-label'] as string | undefined)"
		:data-disabled="disabled ? 'true' : (attrs['data-disabled'] as string | undefined)"
		:aria-disabled="anchorBlocked ? 'true' : (attrs['aria-disabled'] as AriaFlag)"
		:aria-busy="loading ? 'true' : (attrs['aria-busy'] as AriaFlag)"
		:tabindex="anchorInert ? -1 : (attrs.tabindex as number | string | undefined)"
		@click="handleClick"
		@auxclick="handleAuxClick"
	>
		<!--
			The lead slot. Both branches of this component render it identically —
			see the button branch below for why a `<Transition>` holding two keyed
			children is the right shape here rather than one presence binding.
		-->
		<span
			v-if="loading || $slots.iconStart"
			class="ft-btn-lead"
			:aria-hidden="loading ? 'true' : undefined"
		>
			<Transition
				:css="false"
				@enter="leadEnter"
				@leave="leadLeave"
				@enter-cancelled="leadCancelled"
				@leave-cancelled="leadCancelled"
			>
				<span v-if="loading" key="spinner" class="ft-btn-spinner"></span>
				<span v-else key="icon" class="ft-btn-lead-icon">
					<slot name="iconStart" />
				</span>
			</Transition>
		</span>
		<slot />
		<slot name="iconEnd" />
	</a>
	<button
		v-else
		ref="el"
		v-bind="forwarded()"
		:class="classes"
		:type="type"
		:disabled="disabled"
		:aria-label="label ?? (attrs['aria-label'] as string | undefined)"
		:aria-busy="loading ? 'true' : (attrs['aria-busy'] as AriaFlag)"
		@click="handleClick"
	>
		<!--
			The lead slot: one fixed-size cell that holds the spinner and
			`iconStart` at the same time, so `loading` swaps them by cross-fading
			in place instead of cutting, and the label beside it never shifts.

			Two keyed children of one `<Transition :css="false">` rather than a
			presence binding. Three reasons, all structural: the spinner and the
			icon are DIFFERENT elements, so there is no single node whose
			transition could be bidirectional; a cross-fade wants both halves
			running at once rather than one after the other, which is the default
			(unset) transition mode; and nothing in either subtree owns a teardown
			that has to land at exit end. The outer `v-if="loading ||
			$slots.iconStart"` keeps a button with neither from paying for an
			empty grid cell — and, because a transition never plays on the initial
			render of the block that owns it, a button that starts out `loading`
			still renders its spinner instantly, with no fade in from nothing.

			The `key` on each child is load-bearing, not decoration: both are
			`<span>`s, and without distinct keys Vue patches one into the other in
			place instead of transitioning between them.

			`aria-hidden` sits on the cell rather than on the spinner so that it
			covers the whole cell for the length of the fade: mid-swap the
			outgoing icon is still mounted, and a screen reader has no business
			reading a glyph that is on its way out of a control already marked
			`aria-busy`.
		-->
		<span
			v-if="loading || $slots.iconStart"
			class="ft-btn-lead"
			:aria-hidden="loading ? 'true' : undefined"
		>
			<Transition
				:css="false"
				@enter="leadEnter"
				@leave="leadLeave"
				@enter-cancelled="leadCancelled"
				@leave-cancelled="leadCancelled"
			>
				<span v-if="loading" key="spinner" class="ft-btn-spinner"></span>
				<span v-else key="icon" class="ft-btn-lead-icon">
					<slot name="iconStart" />
				</span>
			</Transition>
		</span>
		<slot />
		<slot name="iconEnd" />
	</button>
</template>

<style scoped>
.ft-btn {
	--ft-btn-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	/* 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) =
	   tokens.EASINGS.inout — the reversible-state pair. It runs the colour
	   channel, and the release half of the press: letting go settles, it
	   does not snap back. */
	--ft-btn-motion: var(--ft-duration-fast, 150ms) var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	/* The down-stroke only. 150ms = tokens.DURATIONS.fast,
	   cubic-bezier(0.16, 1, 0.3, 1) = tokens.EASINGS.out — the arrival
	   curve, which spends most of the scale in the first frames. Same clock
	   as the release, but the button is already down by the time the eye
	   reads it, so the press bites instead of easing in. Pressing is an
	   arrival; releasing is what resolves either way. */
	--ft-btn-press: var(--ft-duration-fast, 150ms) var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	/*
	 * Replaces the `transition-colors` utility removed from the class string
	 * above, at exactly the values that utility already resolved to. Colour is
	 * a state change, not motion, so it stays OUTSIDE the reduced-motion query
	 * — gating it would only make a theme flip look broken for the people who
	 * asked for less movement.
	 *
	 * `box-shadow` is deliberately absent, and must stay absent: this button's
	 * focus ring is `focus-visible:ring-*`, which compiles to a `box-shadow`,
	 * and a focus ring must never animate. `text-decoration-color`, `fill` and
	 * `stroke` never change on this control, so the three listed here are the
	 * faithful subset of what the utility covered.
	 */
	transition:
		color var(--ft-btn-motion),
		background-color var(--ft-btn-motion),
		border-color var(--ft-btn-motion);
	/* Kills the ~300ms tap delay without blocking scroll — the same rule, for
	   the same reason, as `.ft-pressable` and `.ft-toggle`. A press that
	   answers a third of a second late is not press feedback. */
	touch-action: manipulation;
}

/*
 * The press. Pressable's contract inlined as a plain rule on the native
 * control rather than wrapping a `<button>` in a `<Pressable>` div — same
 * `0.97`, same clock, one element instead of two.
 *
 * Only the property list is re-declared in here: `transform` joins the colour
 * channel under `no-preference` and nowhere else, so with motion reduced the
 * colours still cross and the button simply does not move. The resting state
 * (no `transform` at all) is the ungated fallback.
 *
 * The two strokes are timed apart. The rule below carries the release curve,
 * because that is the transition the button runs on its way back to rest;
 * `:active` overrides `transform` with the arrival curve for the way down.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-btn {
		transition:
			color var(--ft-btn-motion),
			background-color var(--ft-btn-motion),
			border-color var(--ft-btn-motion),
			transform var(--ft-btn-motion);
	}

	/* Both inert states are excluded so a press that does nothing does not
	   pretend to. `[data-disabled]` is the anchor branch, which has no native
	   `:disabled` to hang this off; `[aria-busy]` is the loading one, on both
	   branches. A native disabled `<button>` never matches `:active` anyway —
	   the attribute selectors are what make the anchor behave like it. */
	.ft-btn:not([data-disabled="true"]):not([aria-busy="true"]):active {
		transform: scale(0.97);
		/* The whole list is re-declared rather than just
		   `transition-timing-function`, which has no per-property form here:
		   a single value would retime the colour channel too, and a
		   four-value one would restate the same three curves to change the
		   fourth. Only `transform` differs from the rule above. */
		transition:
			color var(--ft-btn-motion),
			background-color var(--ft-btn-motion),
			border-color var(--ft-btn-motion),
			transform var(--ft-btn-press);
	}
}

/*
 * The lead slot: one fixed cell the spinner and `iconStart` share, sized
 * exactly like the spinner it holds (`calc(1em + 1px)`, read from the
 * button's own font-size, so it follows the size variant for free). Fixed
 * rather than content-sized on purpose — a slot that measured whichever
 * child happened to be mounted would grow while both are cross-fading and
 * snap back the frame the fade ended, moving the label twice for one swap.
 */
.ft-btn-lead {
	display: grid;
	place-items: center;
	flex: none;
	width: calc(1em + 1px);
	height: calc(1em + 1px);
}

/* Both children occupy the one cell at once — that overlap IS the
   cross-fade. Named rather than `> *` so a caller's own `iconStart` markup,
   which is one level further down, is never caught by it. */
.ft-btn-lead > .ft-btn-spinner,
.ft-btn-lead > .ft-btn-lead-icon {
	grid-area: 1 / 1;
}

.ft-btn-lead-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.ft-btn--accent {
	background: var(--ft-btn-accent);
	color: var(--ft-accent-foreground, oklch(1 0 0));
}

.ft-btn--accent:hover {
	background: color-mix(in oklab, var(--ft-btn-accent) 90%, transparent);
}

/*
 * `1em` reads the button's own font-size, so the ring scales with the size
 * variant instead of needing one fixed diameter per size — at `md` (13px
 * type) that resolves to the mockup's 14px exactly.
 */
.ft-btn-spinner {
	flex: none;
	width: calc(1em + 1px);
	height: calc(1em + 1px);
	border-radius: 50%;
	border: 2px solid color-mix(in oklab, currentColor 30%, transparent);
	border-top-color: currentColor;
}

/*
 * Reduced motion leaves the ring exactly where a static ring already reads as
 * "busy" — `aria-busy` carries the meaning for assistive tech either way, so
 * there is nothing to swap out here, only the spin itself to drop.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-btn-spinner {
		animation: ft-btn-spin 0.8s linear infinite;
	}
}

@keyframes ft-btn-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
