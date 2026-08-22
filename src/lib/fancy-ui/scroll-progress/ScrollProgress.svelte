<script lang="ts" module>
	import type { HTMLAttributes } from "svelte/elements";

	type BaseProps = {
		/**
		 * An element to track instead of the document's own scroll. Setting
		 * this always forces JS mode (see the README's Motion section) — a
		 * CSS `scroll-timeline` can only reach an ancestor scroller, and an
		 * arbitrary `target` is not guaranteed to be one, so tracking it always
		 * costs a real scroll listener.
		 */
		target?: HTMLElement | null;
		/**
		 * `"top"` / `"bottom"` pin the bar to the matching viewport edge
		 * (`position: fixed` — the reading-progress convention, and a
		 * deliberate exception to the "a library component never leaves
		 * normal flow" rule). `"inline"` renders it in normal flow instead, so
		 * the caller places it — e.g. directly above the `target` it tracks.
		 */
		position?: "top" | "bottom" | "inline";
		/**
		 * Announces the bar as `role="progressbar"` with this accessible
		 * name. Omitted (the default), the bar is `aria-hidden="true"` —
		 * decorative chrome, the same choice most reading-progress bars make.
		 * Setting this also forces JS mode, same as `target`: a CSS-only bar
		 * has no live number to hand `aria-valuenow`.
		 */
		label?: string;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	};

	/**
	 * Props for ScrollProgress
	 */
	export type ScrollProgressProps = BaseProps &
		Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>;
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";
	import { rafThrottle } from "../_internals/motion/raf.js";

	let {
		target = null,
		position = "top",
		label,
		class: className,
		ref = $bindable(null),
		...restProps
	}: ScrollProgressProps = $props();

	/**
	 * `CSS.supports("animation-timeline", "scroll()")` is a fact about the
	 * environment — probed exactly ONCE, inside `onMount`, and never again.
	 * Browser support for a CSS feature doesn't change mid-session, so
	 * re-probing on every render would just be wasted work.
	 *
	 * `undefined` (not yet probed) is also the SSR value and the value for
	 * every render before `onMount` runs — `data-mode` is therefore absent
	 * from the server-rendered HTML and only ever gets ADDED client-side,
	 * never changed out from under something the server already committed
	 * to. That is what keeps this hydration-safe: an attribute that doesn't
	 * exist yet on the server can't mismatch one added later.
	 */
	let supportsScrollTimeline = $state<boolean | undefined>(undefined);

	/**
	 * `mode` itself is `$derived`, NOT latched at the same moment as the
	 * capability probe above — it is recomputed from `supportsScrollTimeline`
	 * together with the live `target`/`label` props. That distinction matters
	 * because a `target` (or `label`) can arrive AFTER `onMount` has already
	 * run: `<ScrollProgress target={box} /> …later… <div bind:this={box}>`
	 * sees `target === null` on the tick `onMount` fires (`bind:this` on an
	 * element written below this component in the template resolves in a
	 * later effect pass), and so does any `{#if}`-gated scroller, async
	 * content, or route change that hands this component a target after the
	 * fact. Deriving `mode` means a bar that starts in CSS mode still flips
	 * to JS mode the instant such a `target`/`label` shows up, instead of
	 * staying latched onto the document's scroll forever. See the README's
	 * Implementation notes.
	 */
	const mode = $derived<"css" | "js" | undefined>(
		supportsScrollTimeline === undefined
			? undefined
			: !target && label === undefined && supportsScrollTimeline
				? "css"
				: "js"
	);

	/**
	 * Only meaningful once `label` is set — otherwise `aria-valuenow` is
	 * never rendered at all (see the template) and this is harmless, unread
	 * state. Routed through `$state` rather than written straight to the DOM:
	 * unlike the per-frame `--ft-scrollprogress-value` write below, this only
	 * changes once per throttled tick and rounds to a whole percent, so the
	 * "bypass reactivity in a hot loop" doctrine doesn't apply — there is no
	 * hot loop here, just an occasional integer.
	 */
	let valueNow = $state(0);

	onMount(() => {
		supportsScrollTimeline =
			typeof CSS !== "undefined" &&
			typeof CSS.supports === "function" &&
			CSS.supports("animation-timeline", "scroll()");
	});

	function clamp01(value: number): number {
		if (value < 0) return 0;
		if (value > 1) return 1;
		return value;
	}

	/**
	 * `scroller === window` reads the DOCUMENT's own scroll (the default,
	 * no-`target` case); any other value is an element the caller wants
	 * tracked instead. `HTMLElement` is only ever referenced from inside
	 * here, itself only ever called from the JS-mode effect below — which
	 * `$effect` never runs during SSR — so the global is safe to name even
	 * though this file has no top-of-module `typeof window` guard.
	 */
	function readProgress(scroller: Window | HTMLElement): number {
		let scrollTop: number;
		let scrollHeight: number;
		let clientHeight: number;
		if (scroller instanceof HTMLElement) {
			({ scrollTop, scrollHeight, clientHeight } = scroller);
		} else {
			scrollTop = window.scrollY;
			scrollHeight = document.documentElement.scrollHeight;
			clientHeight = document.documentElement.clientHeight;
		}
		const max = scrollHeight - clientHeight;
		// Nothing to scroll (content fits, or hasn't laid out yet under
		// jsdom) reads as 0, not NaN/Infinity from a division by zero — an
		// empty reading-progress bar is the honest answer for "no distance to
		// travel", not an undefined one.
		return max > 0 ? clamp01(scrollTop / max) : 0;
	}

	function update() {
		const node = ref;
		if (!node) return;
		const progress = readProgress(target ?? window);
		// Bypasses Svelte reactivity on purpose, per the family's rAF-loop
		// doctrine: this can run up to once per animation frame, and routing
		// it through `$state` → template re-render would be the exact
		// anti-pattern the doctrine warns about for a per-frame write. Set on
		// the ROOT (not the bar) — CSS custom properties inherit, so the bar
		// picks the value up through `.ft-scrollprogress-bar`'s own
		// `scaleX(var(--ft-scrollprogress-value, 0))` without a second write.
		node.style.setProperty("--ft-scrollprogress-value", String(progress));
		if (label !== undefined) valueNow = Math.round(progress * 100);
	}

	// Only JS mode ever attaches anything. CSS mode's entire reason to exist
	// is tracking scroll with ZERO JS — including before this effect has had
	// a chance to run at all, via the `@supports`-gated keyframe animation in
	// the stylesheet below.
	$effect(() => {
		if (mode !== "js") return;
		const node = ref;
		if (!node) return;
		const scroller: Window | HTMLElement = target ?? window;
		const eventTarget = scroller as EventTarget;
		const throttled = rafThrottle(update);
		const onScrollOrResize = () => throttled();

		update(); // paints the CURRENT position immediately, not just on the next scroll/resize
		eventTarget.addEventListener("scroll", onScrollOrResize, { passive: true });
		eventTarget.addEventListener("resize", onScrollOrResize, { passive: true });

		return () => {
			eventTarget.removeEventListener("scroll", onScrollOrResize);
			eventTarget.removeEventListener("resize", onScrollOrResize);
			throttled.cancel();
		};
	});
</script>

<div
	bind:this={ref}
	class={cn("ft-scrollprogress", className)}
	{...restProps}
	data-position={position}
	data-mode={mode}
	role={label !== undefined ? "progressbar" : undefined}
	aria-label={label}
	aria-valuemin={label !== undefined ? 0 : undefined}
	aria-valuemax={label !== undefined ? 100 : undefined}
	aria-valuenow={label !== undefined ? valueNow : undefined}
	aria-hidden={label === undefined ? "true" : undefined}
>
	<div class="ft-scrollprogress-bar"></div>
</div>

<style>
	.ft-scrollprogress {
		display: block;
		height: var(--ft-scrollprogress-thickness, 3px);
		background: var(--ft-scrollprogress-track, transparent);
		overflow: hidden;
	}

	.ft-scrollprogress[data-position="top"],
	.ft-scrollprogress[data-position="bottom"] {
		position: fixed;
		right: 0;
		left: 0;
		z-index: var(--ft-scrollprogress-z, 50);
	}
	.ft-scrollprogress[data-position="top"] {
		top: 0;
	}
	.ft-scrollprogress[data-position="bottom"] {
		bottom: 0;
	}
	.ft-scrollprogress[data-position="inline"] {
		position: static;
		width: 100%;
	}

	/* Logical default: the bar fills from the reading-start edge. RTL flips
	   which physical edge that is — `transform-origin` isn't itself a
	   direction-aware property, so it needs this explicit override. */
	.ft-scrollprogress:dir(rtl) {
		--ft-scrollprogress-origin: right;
	}

	.ft-scrollprogress-bar {
		width: 100%;
		height: 100%;
		background: var(--ft-scrollprogress-color, currentColor);
		/* scaleX, never width — the family rule ("opacity/transform only")
		   plus a practical one: animating width forces layout on every frame,
		   scaleX is compositor-only. */
		transform: scaleX(var(--ft-scrollprogress-value, 0));
		transform-origin: var(--ft-scrollprogress-origin, left);
		transition: none;
	}

	/*
	 * The zero-JS path: a native scroll-driven animation grows the bar from
	 * 0 to full width purely off the document's own scroll position, working
	 * before hydration and without this component ever running a scroll
	 * listener. `:not([data-mode="js"])` matches BOTH the pre-mount state (no
	 * `data-mode` attribute exists yet) and the post-mount `"css"` mode
	 * explicitly. What this guarantees: no hydration mismatch (the attribute
	 * is only ever ADDED client-side, never changed out from under something
	 * the server already committed to), and a bar that ends up in CSS mode is
	 * already painting correctly before `onMount` runs at all. It does NOT
	 * guarantee the mechanism is always right pre-mount for a bar that ends
	 * up in JS mode (a `target`/`label` bar): for the one frame between first
	 * paint and `onMount`, `data-mode` is absent, this rule matches, and the
	 * DOCUMENT's scroll is what's actually driving the fill — normally
	 * invisible, but a page restored mid-scroll or reached via an anchor can
	 * paint a wrongly-filled bar for that frame before it snaps to the
	 * target's own progress.
	 *
	 * Deliberately NOT gated behind `prefers-reduced-motion` — see the
	 * README's Motion section for why a 1:1 scroll-position mapping isn't the
	 * kind of animation that preference is about.
	 */
	@supports (animation-timeline: scroll()) {
		.ft-scrollprogress:not([data-mode="js"]) .ft-scrollprogress-bar {
			animation: ft-scrollprogress-grow linear both;
			animation-timeline: scroll(root block);
			/* The shorthand above resets `animation-duration` to its initial
			   value, which the scroll-animations spec changes from `0s` to
			   `auto` — on an engine that ships `animation-timeline` but still
			   carries the OLD initial value, that reset would jump the bar to
			   `scaleX(1)` permanently instead of tracking the timeline. Written
			   standalone (not folded into the shorthand) so that on an engine
			   that doesn't accept `auto` here, this single declaration is what
			   drops — not the whole rule. */
			animation-duration: auto;
		}
	}
	@keyframes ft-scrollprogress-grow {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}
</style>
