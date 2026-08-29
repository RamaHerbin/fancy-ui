<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	/**
	 * Props for DimSiblings.
	 *
	 * DimSiblings is the one component in this collection with zero JavaScript
	 * behaviour: it renders a wrapper and three CSS custom properties, and a
	 * pure `:has()` stylesheet does the rest (hover/focus one direct child,
	 * dim or blur every other one). There is no pointer tracking to clean up
	 * and nothing to gate behind SSR, because there is nothing here that only
	 * runs in the browser.
	 */
	export interface DimSiblingsProps extends Omit<HTMLAttributes<HTMLElement>, "class"> {
		/** Additional CSS classes. */
		class?: string;
		/** Which visual property the non-active siblings lose. */
		effect?: "dim" | "blur" | "both";
		/** Opacity the non-active siblings settle to. A floor, not zero — full
		 * transparency reads as "the card vanished", not "the card is quiet". */
		opacity?: number;
		/** Blur radius, in px, applied only when `effect` includes blur. */
		blur?: number;
		/** Transition duration, in ms, for both the opacity and (if active) the blur. */
		duration?: number;
		/** The rendered root element — `"ul"`/`"ol"` for a list of cards whose
		 * CSS list semantics need to survive the wrapper. */
		as?: keyof HTMLElementTagNameMap;
		/** The sibling group. Every direct child participates. */
		children: Snippet;
		/** The wrapper element. */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	const DEFAULT_OPACITY = 0.4;
	const DEFAULT_DURATION = 150;

	let {
		effect = "dim",
		opacity = DEFAULT_OPACITY,
		blur = 2,
		duration = DEFAULT_DURATION,
		as = "div",
		children,
		class: className,
		ref = $bindable(null),
		...restProps
	}: DimSiblingsProps = $props();

	// Blur is opt-in per `effect`, not per the `blur` prop alone — a caller
	// who leaves `effect="dim"` but tweaks `blur` should not get blur anyway.
	// Baking that choice into the CSS var itself (rather than a second
	// selector keyed off `effect`) keeps the frozen `:has()` rule below at
	// exactly one declaration for hover and one for focus, whatever `effect`
	// resolves to.
	const blurPx = $derived(effect === "dim" ? 0 : blur);
</script>

<svelte:element
	this={as}
	bind:this={ref}
	class={cn("ft-dimsiblings", className)}
	{...restProps}
	style:--ft-dimsiblings-opacity={opacity === DEFAULT_OPACITY ? undefined : opacity}
	style:--ft-dimsiblings-blur={`${blurPx}px`}
	style:--ft-dimsiblings-duration={duration === DEFAULT_DURATION ? undefined : `${duration}ms`}
	data-effect={effect}
>
	{@render children()}
</svelte:element>

<style>
	/* `(hover: hover)`-gated: on a touch screen nothing ever satisfies `:hover`
	   in the first place, but gating explicitly (rather than relying on that)
	   matches this collection's other hover-affordance precedent
	   (ThreadList's delete button) and keeps the rule from ever appearing to
	   "stick" on a touch UA that fakes a hover state after a tap.

	   `:not(:has(:global(:focus-visible)))` on the root: focus takes priority
	   over hover. Without it, a `:focus-visible` child and a `:hover` child
	   that are two different elements each dim the *other* rule's target —
	   the hover rule dims everything but the hovered item (including the
	   focused one) while the focus rule dims everything but the focused item
	   (including the hovered one), and the group ends up entirely dimmed.
	   Reached simply by pressing Tab while the pointer rests over the group. */
	@media (hover: hover) {
		/* Keyed on `data-effect` exactly like the `filter` rule below: the
		   opacity dip belongs to the dim-capable effects only, or
		   `effect="blur"` would dim AND blur — behaving identically to
		   `effect="both"` and leaving the public union with two names for one
		   effect. */
		.ft-dimsiblings:is([data-effect="dim"], [data-effect="both"]):not(
				:has(:global(:focus-visible))
			):has(> :global(:hover))
			> :global(:not(:hover)) {
			opacity: var(--ft-dimsiblings-opacity, 0.4);
		}
		/* `filter` is declared only for the blur effects: a `blur(0px)` on the
		   default dim-only path would still promote every sibling to its own
		   compositing layer and flip text to grayscale antialiasing on each
		   hover — a visible weight change for no visual gain. */
		.ft-dimsiblings:is([data-effect="blur"], [data-effect="both"]):not(
				:has(:global(:focus-visible))
			):has(> :global(:hover))
			> :global(:not(:hover)) {
			filter: blur(var(--ft-dimsiblings-blur, 2px));
		}
	}

	/* Unconditional: a keyboard user tabbing through the siblings gets the
	   same "this one, not the others" treatment regardless of hover
	   capability. `:focus-visible`, not `:focus-within` — a programmatic
	   `.focus()` or a mouse-click focus (neither of which shows a focus ring)
	   must not dim every sibling around it. The child selector excludes both
	   shapes of "the active one": `:has(:focus-visible)` catches a wrapped
	   descendant that holds focus, and `:focus-visible` directly catches the
	   focused element itself — `:has()` only matches descendants, so a direct
	   child that IS the focused element does not match the `:has()` half and
	   would otherwise also match `:not(:has(:focus-visible))`, dimming the
	   very item that has focus. This rule always wins over the hover rule
	   above (which excludes itself whenever a focus-visible descendant
	   exists), so a focused item is never dimmed by a same-group hover. */
	.ft-dimsiblings:is([data-effect="dim"], [data-effect="both"]):has(:global(:focus-visible))
		> :global(:not(:focus-visible):not(:has(:focus-visible))) {
		opacity: var(--ft-dimsiblings-opacity, 0.4);
	}
	.ft-dimsiblings:is([data-effect="blur"], [data-effect="both"]):has(:global(:focus-visible))
		> :global(:not(:focus-visible):not(:has(:focus-visible))) {
		filter: blur(var(--ft-dimsiblings-blur, 2px));
	}

	/* Only the transition is reduced-motion-gated — the dim/blur end states
	   above apply either way, they just snap instead of animating. */
	@media (prefers-reduced-motion: no-preference) {
		.ft-dimsiblings > :global(*) {
			/* Literal fallbacks: 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout */
			transition:
				opacity var(--ft-dimsiblings-duration, var(--ft-duration-fast, 150ms))
					var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1)),
				filter var(--ft-dimsiblings-duration, var(--ft-duration-fast, 150ms))
					var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
		}
	}

	/* A forced-colors palette (Windows High Contrast) replaces `currentColor`
	   content wholesale and has no reliable notion of "dimmed" — leaving this
	   rule active would silently drop contrast the OS is specifically trying
	   to guarantee. `prefers-contrast: more` covers every other platform's
	   "increase contrast" preference (macOS/iOS Increase Contrast, a Windows
	   contrast preference without a contrast *theme*), where nothing forces
	   colors but a reader has still said normal contrast isn't enough for
	   them; `prefers-reduced-transparency: reduce` for the same reasoning
	   applied to the opacity dip itself — this component's entire job is
	   removing contrast or adding translucency, so all three preferences get
	   the same full reset. Both selectors are repeated
	   verbatim (rather than a broader `> *` reset) so specificity ties the
	   hover/focus rules above exactly — `@media` alone adds no specificity,
	   so a looser reset here would silently lose the cascade and never
	   actually apply. */
	@media (forced-colors: active), (prefers-contrast: more), (prefers-reduced-transparency: reduce) {
		.ft-dimsiblings:is([data-effect="dim"], [data-effect="both"]):not(
				:has(:global(:focus-visible))
			):has(> :global(:hover))
			> :global(:not(:hover)),
		.ft-dimsiblings:is([data-effect="dim"], [data-effect="both"]):has(:global(:focus-visible))
			> :global(:not(:focus-visible):not(:has(:focus-visible))) {
			opacity: 1;
		}
		/* Same (0,1,0) bump as the blur rules above, so this reset ties them. */
		.ft-dimsiblings:is([data-effect="blur"], [data-effect="both"]):not(
				:has(:global(:focus-visible))
			):has(> :global(:hover))
			> :global(:not(:hover)),
		.ft-dimsiblings:is([data-effect="blur"], [data-effect="both"]):has(:global(:focus-visible))
			> :global(:not(:focus-visible):not(:has(:focus-visible))) {
			filter: none;
		}
	}
</style>
