<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface TabsListProps {
		/** The `TabsTrigger`s. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";
	import { TABS_KEY, type TabsContext } from "./types.js";

	let { children, class: className, ref = $bindable(null) }: TabsListProps = $props();

	// Undefined outside a Tabs root: orientation/variant then fall back to
	// this component's own defaults rather than throwing, matching every
	// other compound in this library.
	const context = getContext<TabsContext | undefined>(TABS_KEY);
	const orientation = $derived(context?.orientation ?? "horizontal");
	const variant = $derived(context?.variant ?? "underline");

	const classes = $derived(
		cn(
			"ft-tabs-list inline-flex",
			orientation === "vertical" ? "flex-col" : "flex-row",
			variant === "underline"
				? cn("border-border", orientation === "vertical" ? "border-r" : "border-b")
				: "ft-tabs-list-segmented bg-background border-border w-fit border",
			className
		)
	);

	/*
	 * ---------------------------------------------------------------------
	 * The sliding indicator
	 * ---------------------------------------------------------------------
	 *
	 * A single `aria-hidden` box, absolutely positioned at the list's own
	 * origin and moved with `transform` alone — never `left`/`width`, which
	 * would relayout the whole rail on every keystroke of an arrow-key walk.
	 * It is a 1×1 box that `translate()` puts at the selected trigger and
	 * `scale()` stretches to its size, so one transform carries both the
	 * position and the length.
	 *
	 * It is a progressive enhancement, never the only selection signal: the
	 * selected trigger keeps `aria-selected="true"` and its own foreground
	 * colour, so a screen reader, a forced-colors user and a JS-off render
	 * all still see which tab is active.
	 */

	let indicatorRef = $state<HTMLDivElement | null>(null);

	/** Backstop that drops `will-change` again after a tween. */
	let willChangeTimer: ReturnType<typeof setTimeout> | undefined;

	// `will-change: transform` is a promise to the compositor, not a style;
	// leaving it on permanently costs a permanent layer for a bar that moves
	// a few times a session. `transitionend` is the honest signal to drop it,
	// but jsdom never fires one, so the release is keyed to the same token the
	// CSS transition below uses plus a slack margin — deterministic in both.
	const WILL_CHANGE_RELEASE = DURATIONS.fast + 50;

	// Snapshots of the inputs the last placement ran with. Plain variables,
	// not `$state` — only the placement effect reads or writes them, and
	// nothing needs to react to them changing. They are what lets one effect
	// tell three cases apart: a selection moving (tween), a geometry change
	// (snap, because tweening between two different geometries is
	// meaningless), and the very first paint (snap, because the bar must not
	// fly in from `translate(0) scale(0)`).
	let placedOnce = false;
	let lastValue: string | undefined;
	let lastOrientation: "horizontal" | "vertical" | undefined;
	let lastVariant: "underline" | "segmented" | undefined;

	function activeTrigger(): HTMLElement | null {
		return ref?.querySelector<HTMLElement>('[data-ft-tabs-trigger][aria-selected="true"]') ?? null;
	}

	function releaseWillChange(): void {
		clearTimeout(willChangeTimer);
		willChangeTimer = undefined;
		const el = indicatorRef;
		if (el) el.style.willChange = "";
	}

	/**
	 * Writes the indicator's transform. `animate: false` snaps: first paint,
	 * a resize, an orientation/variant change, and every write made while the
	 * user asks for reduced motion — the bar still tracks the selection then,
	 * it just arrives without a tween.
	 */
	function place(animate: boolean): void {
		const el = indicatorRef;
		if (!el) return;

		const active = activeTrigger();
		if (!active) {
			// Nothing is selected — `value` was never set, or points at a
			// value no trigger claims. The bar is not "at zero", it is absent.
			el.style.opacity = "0";
			return;
		}

		const vertical = orientation === "vertical";
		const off = vertical ? active.offsetTop : active.offsetLeft;
		const size = vertical ? active.offsetHeight : active.offsetWidth;

		// A zero-size measurement is jsdom, a `display: none` ancestor, or a
		// first paint the browser has not laid out yet — never a real state.
		// Stay hidden rather than collapsing to a 0-wide sliver at the origin.
		if (size === 0) {
			el.style.opacity = "0";
			return;
		}
		el.style.opacity = "1";

		// The segmented pill is the trigger's whole box, so it stretches on
		// both axes; the underline bar is a 2px rule that only ever grows
		// along the rail's own axis.
		const transform =
			variant === "segmented"
				? `translate(${active.offsetLeft}px, ${active.offsetTop}px) scale(${active.offsetWidth}, ${active.offsetHeight})`
				: vertical
					? `translateY(${off}px) scaleY(${size})`
					: `translateX(${off}px) scaleX(${size})`;

		if (variant === "segmented") {
			// Feeds the `calc()` in the CSS that pre-divides the pill's radius
			// by its own scale factors, so the rendered corner keeps the
			// theme's own radius instead of being stretched into an ellipse.
			// Written by JS, and therefore internal — not a knob a consumer
			// should set.
			el.style.setProperty("--ft-tabs-indicator-sx", String(active.offsetWidth));
			el.style.setProperty("--ft-tabs-indicator-sy", String(active.offsetHeight));
		}

		// The selection did not move — this is a focus walk (the effect below
		// reads `focusedValue`), or a resize that changed nothing. Rewriting a
		// byte-identical transform would force a layout for nothing, and — on
		// the `animate: false` path, which suspends the transition — would
		// cancel a slide that is still in flight and teleport the bar to its
		// destination.
		if (el.style.transform === transform) return;

		// Nothing to tween FROM: the bar has never been successfully placed
		// (nothing was selected at mount, or the last measurement was zero, so
		// the branches above returned before writing anything). A transition
		// from the identity matrix would fly a 1x1 box in from the list's own
		// origin — the same artifact the first-paint snap exists to prevent.
		if (animate && !el.style.transform) animate = false;

		if (animate) {
			el.style.willChange = "transform";
			el.style.transform = transform;
			clearTimeout(willChangeTimer);
			willChangeTimer = setTimeout(releaseWillChange, WILL_CHANGE_RELEASE);
			return;
		}

		// Suspend → write → force a reflow → restore. Without the forced read
		// between suspending and restoring, the browser coalesces all three
		// writes into one style recalculation and the "snap" tweens anyway.
		// Restoring the *previous* value rather than clearing it is what keeps
		// a consumer's own inline `transition` (or a later tween) alive.
		releaseWillChange();
		const previous = el.style.transition;
		el.style.transition = "none";
		el.style.transform = transform;
		void el.offsetWidth;
		el.style.transition = previous;
	}

	// Everything that outlives a single render lives here, and this effect
	// depends on `ref` alone — deliberately NOT on the selection.
	//
	// DEVIATION from the contract's "one `$effect` owns all of it": a
	// `ResizeObserver` delivers a callback as soon as `observe()` runs, so
	// folding the observer into the placement effect below would tear it down
	// and re-establish it on every tab change, and that first callback would
	// land right after the tween's write and snap it. Splitting on `ref`
	// keeps the observer alive across selections; the cleanup still does both
	// jobs the contract asks of it, on unmount.
	$effect(() => {
		const list = ref;
		if (!list) return;

		// The list's own box changing means every trigger's offset may have
		// moved: a wrap, a font swap, a sibling arriving. R8: a resize snaps,
		// it never tweens — the bar was never "travelling" to its new place.
		const observer = new ResizeObserver(() => place(false));
		observer.observe(list);

		return () => {
			observer.disconnect();
			releaseWillChange();
		};
	});

	$effect(() => {
		const value = context?.value ?? "";
		// Read, not used: `focusedValue` recomputes from the roving-focus
		// registry, so a trigger mounting or unmounting re-runs this effect
		// and re-places the bar. The list's own `ResizeObserver` catches the
		// same thing in a browser, but only once layout has settled — this
		// gets there in the same flush.
		void context?.focusedValue;
		const nextOrientation = orientation;
		const nextVariant = variant;

		const first = !placedOnce;
		const geometryChanged = nextOrientation !== lastOrientation || nextVariant !== lastVariant;
		const selectionMoved = value !== lastValue;

		placedOnce = true;
		lastValue = value;
		lastOrientation = nextOrientation;
		lastVariant = nextVariant;

		// The tween is the one case where all three conditions hold. Reduced
		// motion is read here, at the instant of the write, rather than kept
		// as reactive state: a preference that flips mid-flight should not
		// retro-cancel a bar already on its way.
		place(selectionMoved && !first && !geometryChanged && !prefersReducedMotion());
	});
</script>

<!--
	role="tablist" needs no accessible name of its own per the WAI-ARIA Tabs
	pattern unless a page has more than one — a consumer with several tab
	groups on screen at once can still add one through `class` plus their own
	`aria-label` via a wrapping element, or by giving each Tabs root a
	distinct heading before it.
-->
<div
	bind:this={ref}
	role="tablist"
	aria-orientation={orientation === "vertical" ? "vertical" : undefined}
	data-orientation={orientation}
	data-variant={variant}
	class={classes}
>
	{#if children}
		{@render children()}
	{/if}
	<!--
		Last child so it paints under the triggers in the segmented variant
		without needing a stacking context on the list itself. `aria-hidden`
		plus no role and no tabindex: it is never announced, never focusable,
		and `pointer-events: none` keeps it out of the hit-test entirely.
	-->
	<div
		bind:this={indicatorRef}
		class="ft-tabs-indicator"
		aria-hidden="true"
		data-variant={variant}
		data-orientation={orientation}
	></div>
</div>

<style>
	/*
	 * Makes the list the triggers' `offsetParent`, so `offsetLeft`/`offsetTop`
	 * and the indicator's own `left: 0; top: 0` share one origin (both are
	 * measured from the list's padding box). That shared origin is what
	 * removes every fudge factor from the arithmetic above — including the
	 * segmented rail's 3px padding, which simply falls out of `offsetLeft`.
	 */
	.ft-tabs-list {
		position: relative;
	}

	/*
	 * Exact rail padding/gap/radius from the mockup — not expressible as a
	 * single Tailwind utility. Same `bg-background` reasoning as
	 * ToggleGroup's rail: this app's dark theme has `--muted` *lighter* than
	 * `--card`, so a muted fill on a card-nested rail would read as raised,
	 * the opposite of the mockup's recessed strip.
	 */
	.ft-tabs-list-segmented {
		border-radius: 0.5rem; /* 8px */
		padding: 3px;
		gap: 2px;
	}

	.ft-tabs-indicator {
		position: absolute;
		left: 0;
		top: 0;
		pointer-events: none;
		/* Hidden until the first successful measurement, so a not-yet-laid-out
		   first paint shows nothing rather than a sliver at the origin. */
		opacity: 0;
		transform-origin: left top;
	}

	/*
	 * Underline, horizontal: a 2px bar pinned to the list's bottom edge and
	 * grown along x only. `bottom: 0` overrides the base `top: 0` because the
	 * height is explicit. This lands on exactly the pixels the retired
	 * `inset 0 -2px 0` box-shadow on the trigger used to paint — the trigger's
	 * bottom edge and the list's padding-box bottom are the same line.
	 */
	.ft-tabs-indicator[data-variant="underline"][data-orientation="horizontal"] {
		top: auto;
		bottom: 0;
		width: 1px;
		height: 2px;
		background: var(--ft-tabs-indicator-color, var(--ft-nav-accent));
		transform-origin: left bottom;
	}

	/* Underline, vertical: a 2px bar on the list's inline-start edge, grown
	   along y — where `inset 2px 0 0` used to sit, for the same reason. */
	.ft-tabs-indicator[data-variant="underline"][data-orientation="vertical"] {
		width: 2px;
		height: 1px;
		background: var(--ft-tabs-indicator-color, var(--ft-nav-accent));
		transform-origin: left top;
	}

	/*
	 * Segmented: the pill itself, sized to the trigger's whole box on both
	 * axes. Two variables carry the retired utilities' own values rather than
	 * new numbers, so the resting look is unchanged: `--color-accent` is what
	 * `bg-accent` resolved to, and `--radius-md` is what `rounded-md` resolved
	 * to (Tailwind's stock `0.375rem` is only the last-resort literal — a
	 * theme that redefines the scale, as this app's does, must be followed).
	 *
	 * The corner is then pre-divided by the scale factors JS writes, so what
	 * renders after `scale()` has stretched a 1x1 box is the intended radius
	 * rather than an ellipse — CSS `border-radius` takes a
	 * `<horizontal> / <vertical>` pair for exactly this.
	 */
	.ft-tabs-indicator[data-variant="segmented"] {
		width: 1px;
		height: 1px;
		background: var(--ft-tabs-indicator-color, var(--color-accent));
		border-radius: calc(
				var(--ft-tabs-indicator-radius, var(--radius-md, 0.375rem)) / var(--ft-tabs-indicator-sx, 1)
			) /
			calc(
				var(--ft-tabs-indicator-radius, var(--radius-md, 0.375rem)) / var(--ft-tabs-indicator-sy, 1)
			);
		z-index: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-tabs-indicator {
			/* 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) =
			   tokens.EASINGS.inout. `inout`, not `out`: selecting a tab is a
			   reversible flip between two resting places, not an arrival. */
			transition: transform var(--ft-tabs-indicator-duration, var(--ft-duration-fast, 150ms))
				var(--ft-tabs-indicator-ease, var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1)));
		}
	}

	/*
	 * A forced-colors palette replaces every author background with a system
	 * colour, so the fill has to be re-stated as one of that palette's own
	 * keywords or the bar disappears. Repeating both attributes matches the
	 * specificity of the most specific variant rule above, so this later
	 * declaration actually wins rather than losing to it.
	 */
	@media (forced-colors: active) {
		.ft-tabs-indicator[data-variant][data-orientation] {
			background: Highlight;
		}
	}
</style>
