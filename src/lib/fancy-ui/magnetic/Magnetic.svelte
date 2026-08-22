<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	/**
	 * Props for Magnetic — a generic single-child wrapper that translates its
	 * child toward the pointer while the pointer sits inside an activation
	 * field larger than the child's own box, and springs back to rest once
	 * the pointer leaves. The field is the child's bounding rect inflated by
	 * `radius` on every side (not a circular distance-from-center test) so a
	 * wide button and a small icon feel equally "magnetic" at their edges.
	 *
	 * There is deliberately no keyboard/focus equivalent: unlike Reveal
	 * (which reveals on `focusin`), Magnetic never *reacts* to focus —
	 * `focusin` triggers nothing, and Tab never starts, stops, or changes a
	 * pull. That is not the same claim as "focus always finds it at rest":
	 * if a fine pointer happens to be resting inside the field when focus
	 * arrives, the child is already displaced by that pointer, and Tab lands
	 * on it there — the resting position is the pointer's, not the layout's.
	 * Pointer attraction is a fine-pointer affordance, not a state to
	 * replicate for every input method. See `README.md` for the full
	 * reasoning.
	 */
	export interface MagneticProps extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
		/** Additional CSS classes, merged onto the static outer wrapper. */
		class?: string;
		/** Pull multiplier applied to the pointer's offset from the child's center. Higher = a more aggressive follow. */
		strength?: number;
		/** Pixels the activation field extends beyond the outer element's own box, on every side. Also sizes the (transparent by default) `::before` halo. */
		radius?: number;
		/** Per-axis clamp (px) on the translated offset — a hard travel cap independent of element geometry, `radius`, or `strength`. */
		max?: number;
		/** Disables the pull: no listeners are attached at all, and both translation vars are pinned at `0px`. Never touches the wrapped child's own `disabled` state. */
		disabled?: boolean;
		/** The single wrapped element — a button, icon link, or card. */
		children: Snippet;
		/** Bound reference to the outer (static, untransformed) wrapper element. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { inView } from "../_internals/motion/in-view.js";
	import { rafThrottle } from "../_internals/motion/raf.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	// Literal defaults, also the "has this prop actually been customized"
	// baseline for the inline `--ft-magnetic-radius` var below (see the
	// common contract's "per-component var written inline only when the
	// prop is provided" rule) — an instance left at the default must not
	// shadow a page-level `--ft-magnetic-radius` override with its own
	// hardcoded copy of the same number.
	const DEFAULT_STRENGTH = 0.35;
	const DEFAULT_RADIUS = 40;
	const DEFAULT_MAX = 24;

	let {
		ref = $bindable(null),
		class: className,
		strength = DEFAULT_STRENGTH,
		radius = DEFAULT_RADIUS,
		max = DEFAULT_MAX,
		disabled = false,
		children,
		...restProps
	}: MagneticProps = $props();

	// The ONLY node that ever receives `transform`. The outer node is the
	// stable reference frame every frame's `getBoundingClientRect()` reads
	// against — if the halo or the activation math lived on a node that
	// itself moved, the field would desync from the pull and visually
	// "chase" the pointer.
	let innerRef: HTMLDivElement | null = $state(null);
	let magnetState = $state<"idle" | "active">("idle");
	// Tracks whether the field is actually holding a non-rest pull that a
	// future `release()` would need to zero out. Deliberately NOT the same
	// thing as `magnetState === "active"`: right after mount the state is
	// already "idle" but the vars have never been written at all (still the
	// empty string, not the literal "0px"), so the very first out-of-field
	// frame must still be allowed through once. Starts `true` for exactly
	// that reason; `release()` clears it, the active branch below re-arms it.
	let needsRelease = true;

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	function clamp(value: number, bound: number): number {
		return Math.min(bound, Math.max(-bound, value));
	}

	/**
	 * Zeroes the translation and flips back to idle. One function for every
	 * release path — pointer left the inflated rect, the pointer left the
	 * whole document, a listener teardown, `disabled`/reduced-motion turning
	 * on mid-interaction — so none of them can disagree about what
	 * "released" actually means. Vars are written as the literal `0px`
	 * (never removed), matching the CSS's own `0px` fallback exactly.
	 */
	function release() {
		magnetState = "idle";
		innerRef?.style.setProperty("--ft-magnetic-x", "0px");
		innerRef?.style.setProperty("--ft-magnetic-y", "0px");
		needsRelease = false;
	}

	const handlePointerMove = rafThrottle((event: PointerEvent) => {
		// A touch pointer resting on the field (or a second/third simultaneous
		// touch point) is not "hovering near" anything — it is either about to
		// tap or already part of a multi-touch gesture neither of which this
		// affordance should react to.
		if (event.pointerType === "touch" || !event.isPrimary) return;
		if (!ref || !innerRef) return;

		// Re-measured every frame rather than cached at listener-attach time:
		// a layout shift under the pointer (reflow, a sibling resizing) must
		// never leave the field testing a stale rect.
		const rect = ref.getBoundingClientRect();
		const { clientX: px, clientY: py } = event;
		const inField =
			px >= rect.left - radius &&
			px <= rect.right + radius &&
			py >= rect.top - radius &&
			py <= rect.bottom + radius;

		if (!inField) {
			// Only pay for the write path (a forced `getBoundingClientRect()` is
			// already unavoidable above, but `release()` also does two CSSOM
			// `style.setProperty()` calls) when there is actually something to
			// release — otherwise every `pointermove` anywhere on the page, for
			// the entire time an instance is on screen, dirties this element's
			// style every frame for no reason.
			if (needsRelease) release();
			return;
		}

		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const pullX = clamp((px - centerX) * strength, max);
		const pullY = clamp((py - centerY) * strength, max);

		magnetState = "active";
		needsRelease = true;
		innerRef.style.setProperty("--ft-magnetic-x", `${pullX}px`);
		innerRef.style.setProperty("--ft-magnetic-y", `${pullY}px`);
	});

	// The entire pointer-tracking stack — IntersectionObserver, the window
	// `pointermove` listener, the document `pointerleave` safety net — exists
	// only while Magnetic is actually capable of moving anything. Disabled
	// and reduced-motion both gate at this single point (rather than being
	// threaded through each listener separately) so "no listeners attached"
	// is one branch to verify, not three, and so flipping either prop
	// mid-interaction tears everything down through the same cleanup path
	// an unmount would use.
	$effect(() => {
		if (!ref || disabled || reduced.current) {
			release();
			return;
		}

		let windowListenerAttached = false;

		function attach() {
			if (windowListenerAttached) return;
			windowListenerAttached = true;
			window.addEventListener("pointermove", handlePointerMove, { passive: true });
		}
		function detach() {
			if (!windowListenerAttached) return;
			windowListenerAttached = false;
			window.removeEventListener("pointermove", handlePointerMove);
			release();
		}

		// Called as a plain function rather than via a template `use:inView`
		// directive: the observer must not exist AT ALL while disabled or
		// reduced-motion (this effect's own guard above), and a directive has
		// no way to skip construction conditionally without wrapping the root
		// in an `{#if}` — which would break the "static outer, always
		// present" markup this component's SSR story depends on. `inView` is
		// just `(node, options) => ActionReturn`, so calling it directly here
		// gets the same observer with full control over when it exists.
		//
		// `rootMargin` is inflated by `radius` (not left at the foundation's
		// own default) so a Magnetic instance sitting just outside the
		// viewport — but whose activation field already pokes into it — still
		// gets its window listener attached; a plain "is the raw box on
		// screen" test would otherwise miss that edge case entirely.
		//
		// `inView`'s declared return type is `void | ActionReturn<...>` (the
		// generic shape every Svelte `Action` carries, to support
		// implementations that legitimately return nothing) — but this
		// specific implementation always returns an object, either `{}`
		// (SSR / no-IntersectionObserver fallback) or `{ update, destroy }`.
		// The cast reflects what the real function does, not a workaround
		// for what it might do.
		const ioHandle = inView(ref, {
			once: false,
			threshold: 0,
			rootMargin: `${radius}px`,
			onChange: (intersecting) => {
				if (intersecting) attach();
				else detach();
			},
		}) as { destroy?: () => void };

		// A pointer dragged off to OS chrome or another window never fires
		// another `pointermove` inside this page — without this, the last
		// computed pull would freeze on screen instead of releasing.
		// `pointerleave` (not `mouseleave`) is the event that actually fires
		// when the pointer leaves the whole document, not just one element.
		document.addEventListener("pointerleave", release, { passive: true });

		// `pointerleave` alone misses a keyboard tab switch (Cmd/Alt+Tab,
		// Ctrl+Tab): no pointer crosses any boundary, so nothing above fires,
		// and the pull would otherwise freeze mid-travel until the pointer
		// moves again on return. `window`'s `blur` fires whenever the page
		// loses focus for any reason — including, but not limited to, a tab
		// switch — so it releases that case too.
		window.addEventListener("blur", release, { passive: true });

		return () => {
			ioHandle.destroy?.();
			detach();
			document.removeEventListener("pointerleave", release);
			window.removeEventListener("blur", release);
			handlePointerMove.cancel();
		};
	});
</script>

<div
	bind:this={ref}
	class={cn("ft-magnetic", className)}
	{...restProps}
	style:--ft-magnetic-radius={radius === DEFAULT_RADIUS ? undefined : `${radius}px`}
	data-state={magnetState}
	data-disabled={disabled ? "true" : undefined}
>
	<div bind:this={innerRef} class="ft-magnetic-inner">
		{@render children()}
	</div>
</div>

<style>
	/*
	 * `inline-block` on both nodes: a block-level wrapper would force a line
	 * break around an inline child (an icon link sitting mid-sentence), but
	 * the inner node still needs a real box for `transform` to apply to at
	 * all — `display: contents` (no box) would make the translation a no-op.
	 */
	.ft-magnetic {
		position: relative;
		display: inline-block;
	}

	/*
	 * The activation field's visual footprint, sized to match the geometry
	 * `radius` actually drives. Fully inert by construction: `pointer-events:
	 * none` means no real hit-testable box is ever enlarged, so a generous
	 * `radius` can never start stealing clicks or hovers from a neighbour —
	 * only the halo's own (default: invisible) paint grows. Lives on the
	 * OUTER (never-transformed) node so it never drifts out of sync with the
	 * activation math, which is always measured against the outer's own
	 * untransformed rect.
	 */
	.ft-magnetic::before {
		content: "";
		position: absolute;
		inset: calc(
			-1 * var(--ft-magnetic-radius, 40px)
		); /* tokens: Magnetic's own default radius (40) — no tokens.ts entry, geometry is per-component */
		pointer-events: none;
		/* No `background` declared here (not even `transparent`, which is the
		   property's own initial value and so changes nothing by omitting it).
		   Svelte's scoping hash lands on THIS half of a compound selector as a
		   real class (`.ft-magnetic.svelte-x::before`, specificity (0,2,1)),
		   which would out-specify a consumer's `:global(.ft-magnetic::before)`
		   override (0,1,1) — so a `background` declared here can never
		   actually be beaten by one declared there. Leaving the property
		   undeclared means the consumer's rule is the ONLY one setting it,
		   which is what makes README's `:global(.ft-magnetic::before)` halo
		   recipe (and the contract's promise of it) actually work. */
		border-radius: inherit;
	}

	.ft-magnetic-inner {
		/* `position: relative` unconditionally (not just under the transform
		   media queries below): `::before` is `position: absolute`, so per
		   CSS 2.1 §"painting order" it is ALWAYS painted in the positioned
		   layer. Without this, `.ft-magnetic-inner` is only in that same layer
		   while its `transform` creates a stacking context — true under
		   `no-preference` + `hover: hover`, false under reduced motion and
		   under `(hover: none)` (`transform: none`) — so the halo would paint
		   OVER the child in exactly those two states. Making the inner node
		   positioned too keeps both boxes in the positioned layer, painted in
		   tree order (halo, an earlier sibling, first) in all four
		   combinations, regardless of whether a transform happens to be live. */
		position: relative;
		display: inline-block;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-magnetic-inner {
			transform: translate(var(--ft-magnetic-x, 0px), var(--ft-magnetic-y, 0px));
		}

		/* An eased curve, not `transition: none`: the target is rewritten every
		   frame, so this smoothing reads as slight inertia (a hand-held jitter
		   does not become a control jitter) rather than a delay — replaying
		   raw rAF-sampled pointer motion one-to-one would twitch, not follow. */
		.ft-magnetic[data-state="active"] .ft-magnetic-inner {
			transition: transform var(--ft-duration-fast, 150ms)
				var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1)); /* tokens.DURATIONS.fast / tokens.EASINGS.inout */
			will-change: transform;
		}

		/* Slower on release: the element settles back to rest rather than
		   snapping off, and reads as "let go" instead of "cut short". */
		.ft-magnetic[data-state="idle"] .ft-magnetic-inner {
			transition: transform var(--ft-duration-base, 300ms)
				var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1)); /* tokens.DURATIONS.base / tokens.EASINGS.out */
		}
	}

	/* Coarse pointers (touchscreens without a mouse) never see a pull at
	   all, in addition to the `pointerType === "touch"` guard in JS above —
	   defense in depth, not redundant: a stylus/pen pointer type is not
	   ignored by the JS guard, but a touch-only device still has no hover
	   capability to drive a meaningful follow. */
	@media (hover: none) {
		.ft-magnetic-inner {
			transform: none;
		}
	}
</style>
