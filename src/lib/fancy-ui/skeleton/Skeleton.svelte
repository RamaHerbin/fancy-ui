<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	type BaseProps = {
		/** Bone shape: a block, one or more text lines, or a circular avatar */
		variant?: "rect" | "text" | "circle";
		/** Number of text lines to render; only read when `variant="text"`. The
		 * last line renders at 60% width so a paragraph placeholder doesn't read
		 * as a perfect rectangle. */
		lines?: number;
		/** Shimmer sweep, opacity pulse, or a static muted bone (still a valid
		 * loading cue on its own). */
		animation?: "shimmer" | "pulse" | "none";
		/** Whether the placeholder is currently showing. In wrapping mode
		 * (`children` supplied) this drives the swap to real content; in
		 * standalone mode it drives whether anything renders at all. */
		loading?: boolean;
		/** The one screen-reader announcement. Pass `""` to silence it entirely. */
		label?: string;
		/** Real content to reveal once `loading` is false. Its mere presence (not
		 * its value) is what switches Skeleton from standalone to wrapping mode —
		 * see the README for the two ARIA shapes that follow from that. */
		children?: Snippet;
		/** Additional CSS classes. Also the usual sizing hook: `rect`/`text` bones
		 * have no intrinsic size, so a caller sizes them with `class="h-4 w-40"`
		 * or similar. */
		class?: string;
		/** Element reference. `null` whenever nothing is rendered (standalone
		 * mode with `loading=false`), matching the rest of the library's "ref is
		 * null while there's no root to bind" convention (see Presence). */
		ref?: HTMLDivElement | null;
	};

	/**
	 * Props for Skeleton.
	 */
	export type SkeletonProps = BaseProps & Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		variant = "rect",
		lines = 1,
		animation = "shimmer",
		loading = true,
		label = "Loading",
		children,
		class: className,
		ref = $bindable(null),
		...restProps
	}: SkeletonProps = $props();

	// Presence of `children` — not its current value — is what decides the
	// mode. A caller that always passes `children` (even while it renders
	// nothing meaningful yet) is asking for wrapping mode's ARIA shape, which
	// is the point: the two shapes differ in what happens once `loading` goes
	// false, and only wrapping mode has something to swap to.
	const wrapping = $derived(children !== undefined);

	// `Math.floor` alone would let a non-finite `lines` (NaN, ±Infinity) leak
	// through `Math.max` unclamped (`Math.max(1, NaN)` is `NaN`, and
	// `Array.from({ length: NaN })` is `[]` — a caller-supplied bad value would
	// silently render zero bones). `Number.isFinite` catches that before the
	// clamp instead.
	const lineCount = $derived.by(() => {
		if (variant !== "text") return 1;
		const n = Math.floor(lines);
		return Number.isFinite(n) ? Math.max(1, n) : 1;
	});
	const bones = $derived(Array.from({ length: lineCount }, (_, i) => i));

	// Page-wide shimmer phase sync. Every Skeleton instance on the page reads
	// the SAME shared monotonic timeline, so instances that mount at different
	// wall-clock moments (e.g. a list revealing rows progressively) still
	// converge on one shimmer phase instead of each starting its own visibly
	// drifting 1.6s loop. `document.timeline` is a Level-2 Web Animations API
	// surface — not universal (Safari support lagged historically) and absent
	// in jsdom — so this degrades to "every instance loops unsynced from 0%,
	// still animates correctly" whenever it's unavailable. Never a hard
	// requirement, just a nicety where supported.
	//
	// Written through a `style:` directive (below), not a raw `style=`
	// attribute: a raw attribute placed after `{...restProps}` would win over
	// (or, once `phaseValue` is `null`, delete) any `style` a caller passes in
	// restProps — the same reason Magnetic/TextRoll write their own per-
	// component custom properties as directives rather than attributes. `null`
	// (not `""`) is the "omit the property" value the directive expects.
	let phaseValue = $state<string | null>(null);
	$effect(() => {
		if (typeof document === "undefined" || typeof document.timeline?.currentTime !== "number") {
			phaseValue = null;
			return;
		}
		// Mirrors the CSS literal fallback for --ft-skeleton-duration (1.6s).
		// Nothing enforces the two stay equal; update both by hand if the CSS
		// default ever changes.
		const durationMs = 1600;
		const phase = -(Number(document.timeline.currentTime) % durationMs);
		phaseValue = `${phase}ms`;
	});

	function boneClass(index: number): string {
		return cn(
			"ft-skeleton-bone",
			index === lineCount - 1 && lineCount > 1 && "ft-skeleton-bone--short"
		);
	}
</script>

{#snippet bonesList()}
	{#each bones as i (i)}
		<div class={boneClass(i)} aria-hidden="true"></div>
	{/each}
{/snippet}

{#if wrapping}
	<!--
		Wrapping mode: the root IS the eventual content container, so it never
		carries role="status" itself — once loading flips false the real content
		takes over this exact node, and a live region that outlives its own
		announcement would be wrong. aria-busy mirrors Button's own semantics
		(a machine-readable "still working" flag, independent of any visual
		dimming).

		The sr-only status span outlives the bones on purpose: a live region
		that is INSERTED already populated is announced unreliably (assistive
		tech registers the region first, then reports changes to it), and
		`loading` false → true is a normal reuse flow here — a refetch on an
		already-rendered wrapper. So the region is mounted for as long as the
		component is, and only its TEXT changes; emptied rather than removed
		once `children` takes over, so nothing lingers to re-announce.
	-->
	<div
		bind:this={ref}
		class={cn("ft-skeleton", className)}
		{...restProps}
		style:--ft-skeleton-phase={phaseValue}
		aria-busy={loading ? "true" : undefined}
		data-variant={variant}
		data-animation={animation}
		data-loading={loading ? "true" : undefined}
	>
		{#if loading}
			{@render bonesList()}
		{:else}
			{@render children?.()}
		{/if}
		{#if label !== ""}
			<span role="status" aria-live="polite" class="sr-only">{loading ? label : ""}</span>
		{/if}
	</div>
{:else if loading}
	<!--
		Standalone mode: Skeleton IS the loading indicator (a list seeded with
		placeholder rows before data arrives), so the root itself announces —
		copying PixelLoader/TypingIndicator's own role="status" placement
		exactly. There is no `children` to swap to here, so `loading=false` with
		nothing supplied renders nothing at all rather than leaving inert,
		unannounced bones sitting in the DOM.

		That is also why standalone mode cannot keep its live region mounted the
		way wrapping mode does above: with nothing rendered at all there is no
		node left to host one, and the "renders nothing / `ref` is null" contract
		(shared with Presence) outranks it. A caller who toggles `loading` back
		and forth on a persistent node wants wrapping mode.
	-->
	<div
		bind:this={ref}
		class={cn("ft-skeleton", className)}
		{...restProps}
		style:--ft-skeleton-phase={phaseValue}
		role="status"
		aria-live="polite"
		data-variant={variant}
		data-animation={animation}
		data-loading={loading ? "true" : undefined}
	>
		{@render bonesList()}
		{#if label !== ""}
			<span class="sr-only">{label}</span>
		{/if}
	</div>
{/if}

<style>
	.ft-skeleton {
		display: block;
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
	   itself has no explicit height (an auto-height wrapper in wrapping mode)
	   so a bone is never literally invisible. Deliberately not applied to
	   `circle`, which sizes itself via `aspect-ratio` instead. */
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
	 * Shimmer is a translated ::after overlay — transform only, per the
	 * family's "opacity/transform animate, nothing else" rule. Animating
	 * `background-position` (ThinkingIndicator's own text-shimmer technique)
	 * would violate that rule for a plain background property, so the sweep
	 * here is a separate absolutely-positioned layer that only ever moves via
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
	   highlight still starts at the reading-direction's leading edge). Kept as
	   a plain custom-property override on the root (matching ScrollProgress's
	   own `:dir(rtl)` rule) rather than chained onto the `::after` selector
	   itself: Svelte's CSS pruner cannot prove a `:dir()`-qualified ancestor
	   compound still reaches a real scoped descendant and compiles the whole
	   rule away as "unused" once one is chained that way. */
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
