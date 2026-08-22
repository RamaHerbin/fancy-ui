<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { RevealPresetName, StaggerFrom } from "../_internals/motion/types.js";

	export interface RevealProps extends Omit<HTMLAttributes<HTMLElement>, "class" | "children"> {
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
		/** How the very first server-rendered paint looks. `"hidden"` (the default) starts at `data-state="armed"`, so the content is already hidden before hydration and there is no flash — at the cost of staying hidden on a page that never hydrates (the CSS is gated on `(scripting: enabled)`, which reflects the browser, not this page). `"visible"` starts at the pre-mount `"idle"` state, which paints fully visible; the mount effect then flips it to `"armed"` (an instant hide, no fade-out) and the reveal plays from there. Use it for content that must be readable with JS off or on a `csr = false` route, and accept a one-frame flash. See the README's SSR section. */
		initial?: "hidden" | "visible";
		/** The element tag Reveal renders as. */
		as?: keyof HTMLElementTagNameMap;
		/** Fires once per reveal, the moment the state machine reaches `"visible"` — including every re-reveal when `once={false}`. */
		onReveal?: () => void;
		class?: string;
		ref?: HTMLElement | null;
		children: Snippet;
	}
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { inView } from "../_internals/motion/in-view.js";
	import { staggerDelay } from "../_internals/motion/stagger.js";
	import { STAGGER_CAPS } from "../_internals/motion/tokens.js";

	// Named so the template's `style:--ft-reveal-*` directives can compare a
	// caller's value against the shipped default and skip the inline write
	// when they match — the same technique Pressable.svelte's
	// `DEFAULT_SCALE` and Magnetic.svelte's `DEFAULT_RADIUS` already use.
	// This is what keeps the CSS fallback chain (below) actually reachable:
	// an inline style always wins over a stylesheet, so writing these vars
	// unconditionally would make `--ft-reveal-duration` etc. un-themeable no
	// matter what the CSS said.
	const DEFAULT_DURATION = 600; // tokens.DURATIONS.entrance
	const DEFAULT_DELAY = 0;
	const DEFAULT_EASING = "cubic-bezier(0.16, 1, 0.3, 1)"; // tokens.EASINGS.out
	const DEFAULT_DISTANCE = 16;

	let {
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
		onfocusin,
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: RevealProps = $props();

	// The 3-state machine (idle → armed → visible) exists so SSR/pre-hydration
	// content has a stable, honest name for "nothing has run yet" (idle) that
	// is distinct from "the observer is attached and waiting" (armed) — see
	// the README's SSR section for why `initial` picks the STARTING value
	// here rather than a fixed constant. Only `armed` is hidden by the CSS
	// below: `idle` paints visible, which is exactly what `initial="visible"`
	// buys (content readable before hydration, with a one-frame flash when
	// the mount effect arms it), and `armed` is what `initial="hidden"`
	// starts from (no flash, hidden until the reveal fires).
	// `untrack` silences the compiler's `state_referenced_locally` warning —
	// this read of `initial` is deliberately one-shot (the starting value
	// only); a LATER change to the `initial` prop must not reset an
	// already-running reveal back to a pre-mount state.
	let state = $state<"idle" | "armed" | "visible">(
		untrack(() => (initial === "hidden" ? "armed" : "idle"))
	);

	function markVisible() {
		if (state !== "visible") {
			state = "visible";
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
	// only ever reached from a browser event/effect (never during SSR).
	function markArmed() {
		if (ref && typeof document !== "undefined" && ref.contains(document.activeElement)) return;
		state = "armed";
	}

	// Runs exactly once, regardless of any prop changing later — the
	// idle→armed flip is a one-time mount bookkeeping step, not something
	// that should re-fire (or, worse, re-register as a dependency of an
	// $effect that also WRITES `state`, which would just re-run itself
	// pointlessly every time `state` changes afterward — see
	// svelte5-animation-patterns §2c).
	onMount(() => {
		if (state === "idle") state = "armed";
	});

	// trigger="view": the IntersectionObserver path.
	$effect(() => {
		if (trigger !== "view" || !ref) return;
		const el = ref;
		const controller = inView(el, {
			once,
			threshold,
			rootMargin,
			onChange: (inViewNow) => {
				if (inViewNow) markVisible();
				else if (!once) markArmed();
			},
		});
		return () => controller?.destroy?.();
	});

	// trigger="mount": reveal on the next animation frame after mount, so
	// the hidden→visible transition actually has a "from" frame to start
	// from instead of painting already-visible on the very first frame.
	$effect(() => {
		if (trigger !== "mount" || !ref) return;
		let cancelled = false;
		const raf = requestAnimationFrame(() => {
			if (!cancelled) markVisible();
		});
		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
		};
	});

	// trigger="manual": data-state mirrors `active` directly, every time
	// either prop changes. Never re-enters "idle".
	$effect(() => {
		if (trigger !== "manual") return;
		if (active) markVisible();
		else markArmed();
	});

	// A keyboard user can Tab into content that LOOKS invisible (opacity: 0
	// is still focusable — the frozen contract forbids visibility/display
	// specifically so hidden content never leaves the tab order). Revealing
	// on focusin means hidden content never has to be reached blind. This
	// runs regardless of `trigger`, including "manual": if a manual reveal's
	// `active` is still false when focus arrives, focusin wins and shows the
	// content anyway — there's no accessible reason to make a keyboard user
	// wait for an external toggle a mouse user never had to wait for either.
	function handleFocusIn(event: FocusEvent & { currentTarget: EventTarget & HTMLElement }) {
		markVisible();
		// `onfocusin` is pulled out of `restProps` (see the props destructure
		// above) specifically so a caller's own handler still runs — leaving
		// it inside `restProps` would let this component's own `onfocusin`
		// silently win the spread (restProps is spread before this attribute,
		// see below) and discard the caller's.
		onfocusin?.(event);
	}

	// Stagger: only when stagger > 0. Walks the DIRECT ELEMENT children
	// (bare text nodes can't carry a CSS custom property) and writes each
	// one's computed delay as an inline var, re-indexing whenever the child
	// list itself changes (an {#each} list growing, for instance) via
	// MutationObserver — a static :nth-child sheet (see blur-reveal, this
	// component's predecessor) can never do this for an arbitrary/changing
	// child count.
	$effect(() => {
		if (stagger <= 0 || !ref) return;
		const root = ref;

		function apply() {
			const kids = Array.from(root.children).filter(
				(el): el is HTMLElement => el instanceof HTMLElement && !el.hasAttribute("data-reveal-skip")
			);
			for (let i = 0; i < kids.length; i++) {
				const ms = staggerDelay(i, kids.length, stagger, from, STAGGER_CAPS.item);
				kids[i].style.setProperty("--ft-reveal-child-delay", `${ms}ms`);
			}
		}

		apply();
		const observer = new MutationObserver(apply);
		observer.observe(root, { childList: true });
		return () => {
			observer.disconnect();
			// Stagger dropping back to 0 (or the component unmounting) leaves
			// this var behind otherwise — harmless today (the CSS above only
			// reads it under `[data-stagger]`), but it's state this component
			// wrote and no longer owns once the effect that set it tears down.
			for (const el of Array.from(root.children)) {
				if (el instanceof HTMLElement) el.style.removeProperty("--ft-reveal-child-delay");
			}
		};
	});
</script>

<svelte:element
	this={as}
	bind:this={ref}
	class={cn("ft-reveal", className)}
	{...restProps}
	data-state={state}
	data-preset={preset}
	data-stagger={stagger > 0 ? "" : undefined}
	style:--ft-reveal-duration={duration === DEFAULT_DURATION ? undefined : `${duration}ms`}
	style:--ft-reveal-delay={delay === DEFAULT_DELAY ? undefined : `${delay}ms`}
	style:--ft-reveal-easing={easing === DEFAULT_EASING ? undefined : easing}
	style:--ft-reveal-distance={distance === DEFAULT_DISTANCE ? undefined : `${distance}px`}
	onfocusin={handleFocusIn}
>
	{@render children()}
</svelte:element>

<style>
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

	/* Signs mirror _internals/motion/presets.ts's PRESETS table exactly —
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
		   --ft-reveal-child-delay (written per child by the $effect above).
		   data-reveal-skip opts a child out entirely. */
		.ft-reveal[data-stagger][data-state="armed"] > :global(*:not([data-reveal-skip])) {
			opacity: 0;
			transform: var(--ft-reveal-hidden-transform);
		}
		.ft-reveal[data-stagger][data-state="visible"] > :global(*:not([data-reveal-skip])) {
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
