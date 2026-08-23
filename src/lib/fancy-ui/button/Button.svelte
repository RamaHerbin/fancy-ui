<script lang="ts" module>
	import type { Snippet } from "svelte";
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
		/** Fires on activation. Never called while `disabled` or `loading`. */
		onclick?: (event: MouseEvent) => void;
		/** Rendered before the label. Replaced by the spinner while `loading`. */
		iconStart?: Snippet;
		/** Rendered after the label. */
		iconEnd?: Snippet;
		/** The button's label / content. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { fade } from "svelte/transition";
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";

	let {
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
		onclick,
		iconStart,
		iconEnd,
		children,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: ButtonProps = $props();

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
			"border border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive/20",
	};

	const classes = $derived(
		cn(
			"ft-btn",
			"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
			// No `transition-colors` here: the scoped style block below declares a
			// `transition` shorthand on this same element (it has to, so the press
			// scale can join the colour channel under `prefers-reduced-motion:
			// no-preference`), and Svelte's scoped CSS is unlayered while Tailwind's
			// utilities sit in `@layer utilities` — the utility would lose silently
			// and read as a colour transition that never ran. The colour channel is
			// re-declared by hand at exactly the values it resolved to.
			"cursor-pointer",
			"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ft-btn-accent)]/35",
			// `data-disabled` covers the anchor branch, which has no native `:disabled`
			// pseudo-class to hang the same dimmed treatment off. It tracks `disabled`
			// alone, never `loading` — `aria-disabled` also goes true while loading (see
			// `anchorInert` below), but the mockup's loading swatch is explicitly not
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
	const resolvedRel = $derived.by(() => {
		if (target !== "_blank") return rel;
		const tokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
		tokens.add("noopener");
		tokens.add("noreferrer");
		return [...tokens].join(" ");
	});

	// An <a> has no native `disabled` state, and `href`/`target` drive browser
	// behaviour that never reaches `handleClick` at all — middle-click firing
	// `auxclick`, "open link in new tab" from the context menu, a screen reader's
	// own link-activation gesture. `loading` has to block activation exactly like
	// `disabled` does, so on this branch that can only be done by stripping the
	// attributes that make those paths possible, not by adding another JS guard:
	// there is no event to guard on until after the browser has already acted on
	// `href`. Kept as one flag so `href`, `target`, `aria-disabled` and `tabindex`
	// can't drift out of sync with each other.
	const anchorInert = $derived(disabled || loading);

	// The one duration the lead slot's cross-fade runs on: `DURATIONS.micro`, the
	// glyph-scale rung, collapsed to 0 when the user has asked for less motion —
	// at 0 Svelte skips `element.animate()` entirely and the swap is synchronous,
	// which is the same behaviour this button had before the fade existed.
	//
	// Deliberately a plain function, never a `$derived`: `prefersReducedMotion()`
	// resolves `window.matchMedia` fresh on every call and its own contract
	// (`_internals/motion/anchored.ts`) forbids reading it from a `$derived`,
	// where the answer would be computed once and then never revisited. A
	// transition's params thunk runs once per transition, at the instant that
	// transition starts — exactly the call site that contract sanctions.
	function leadFade() {
		return prefersReducedMotion() ? 0 : DURATIONS.micro;
	}

	// The single guard both branches funnel through. A native `disabled` button
	// already refuses real pointer/keyboard input, but a synthetic `.click()` (or
	// an anchor, which has no disabled state at all) walks straight past that —
	// this is what actually keeps the callback from firing.
	function handleClick(event: MouseEvent) {
		if (disabled || loading) {
			event.preventDefault();
			return;
		}
		if (sound) soundFx.play("press");
		onclick?.(event);
	}
</script>

{#if href}
	<a
		bind:this={ref}
		class={classes}
		href={anchorInert ? undefined : href}
		target={anchorInert ? undefined : target}
		rel={resolvedRel}
		aria-label={label}
		data-disabled={disabled ? "true" : undefined}
		aria-disabled={anchorInert ? "true" : undefined}
		aria-busy={loading ? "true" : undefined}
		tabindex={anchorInert ? -1 : undefined}
		onclick={handleClick}
	>
		<!--
			The lead slot. Both branches of this component render it identically —
			see the button branch below for why the split `in:` / `out:` pair is
			the right shape here rather than one bidirectional `transition:`.
		-->
		{#if loading || iconStart}
			<span class="ft-btn-lead" aria-hidden={loading ? "true" : undefined}>
				{#if loading}
					<span
						class="ft-btn-spinner"
						in:fade={{ duration: leadFade() }}
						out:fade={{ duration: leadFade() }}
					></span>
				{:else}
					<span
						class="ft-btn-lead-icon"
						in:fade={{ duration: leadFade() }}
						out:fade={{ duration: leadFade() }}
					>
						{@render iconStart?.()}
					</span>
				{/if}
			</span>
		{/if}
		{@render children?.()}
		{#if iconEnd}
			{@render iconEnd()}
		{/if}
	</a>
{:else}
	<button
		bind:this={ref}
		class={classes}
		{type}
		{disabled}
		aria-label={label}
		aria-busy={loading ? "true" : undefined}
		onclick={handleClick}
	>
		<!--
			The lead slot: one fixed-size cell that holds the spinner and
			`iconStart` at the same time, so `loading` swaps them by cross-fading
			in place instead of cutting, and the label beside it never shifts.

			A split `in:` / `out:` pair rather than one bidirectional
			`transition:`, which is the shape the rest of this campaign uses. Two
			reasons, both structural: the spinner and the icon are DIFFERENT
			elements, so there is no single node whose transition could be
			bidirectional; and a cross-fade wants both halves running at once
			rather than one after the other. The outer `{#if loading || iconStart}`
			keeps a button with neither from paying for an empty grid cell — and,
			because a local transition never plays on the initial render of the
			block that owns it, a button that starts out `loading` still renders
			its spinner instantly, with no fade in from nothing.

			`aria-hidden` sits on the slot rather than on the spinner so that it
			covers the whole cell for the length of the fade: mid-swap the
			outgoing icon is still mounted, and a screen reader has no business
			reading a glyph that is on its way out of a control already marked
			`aria-busy`.
		-->
		{#if loading || iconStart}
			<span class="ft-btn-lead" aria-hidden={loading ? "true" : undefined}>
				{#if loading}
					<span
						class="ft-btn-spinner"
						in:fade={{ duration: leadFade() }}
						out:fade={{ duration: leadFade() }}
					></span>
				{:else}
					<span
						class="ft-btn-lead-icon"
						in:fade={{ duration: leadFade() }}
						out:fade={{ duration: leadFade() }}
					>
						{@render iconStart?.()}
					</span>
				{/if}
			</span>
		{/if}
		{@render children?.()}
		{#if iconEnd}
			{@render iconEnd()}
		{/if}
	</button>
{/if}

<style>
	.ft-btn {
		--ft-btn-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		/* 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) =
		   tokens.EASINGS.inout — the reversible-state pair, because a press
		   resolves either way (released, or the interaction carries on). */
		--ft-btn-motion: var(--ft-duration-fast, 150ms)
			var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
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
