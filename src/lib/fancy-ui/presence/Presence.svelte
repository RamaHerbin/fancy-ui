<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { TransitionConfig } from "svelte/transition";
	import type { PresetName } from "../_internals/motion/types.js";

	export interface PresenceProps extends Omit<
		HTMLAttributes<HTMLDivElement>,
		"class" | "children"
	> {
		/** Whether the content is mounted and, once the entrance settles, visible. */
		open: boolean;
		/** Shares Reveal's preset vocabulary, plus `blur`/`zoom` — the one place besides Reveal a preset may carry `filter`, and here it's opt-in per instance, not per child. */
		preset?: PresetName;
		/** Entrance duration in ms. */
		duration?: number;
		/** Exit duration in ms — shorter than the entrance by default; leaving reads faster than arriving. */
		exitDuration?: number;
		/** Delay in ms before the entrance starts. Applied to the exit too. */
		delay?: number;
		/** Entrance travel distance in px for the four directional presets. The exit travels half as far. */
		distance?: number;
		/** Whether the panel is `inert` while closing. Svelte already does this natively for any element carrying a `transition:` — `false` is an explicit opt-out, applied the moment the exit starts. */
		inert?: boolean;
		/** Fires once the entrance transition settles (`onintroend`). */
		onEnterEnd?: () => void;
		/** Fires once the exit transition settles (`onoutroend`) — NOT guaranteed if the component is destroyed mid-exit; see the README. */
		onExitEnd?: () => void;
		class?: string;
		ref?: HTMLDivElement | null;
		children: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { preset as makePreset } from "../_internals/motion/transitions.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	let {
		open,
		preset = "fade",
		duration = 300, // DURATIONS.base
		exitDuration = 200, // DURATIONS.exit
		delay = 0,
		distance = 16,
		inert = true,
		onEnterEnd,
		onExitEnd,
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: PresenceProps = $props();

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	// Starts "open", not "opening": a LOCAL `transition:` (no `|global`) never
	// plays on the initial render of the block that owns it at all — Svelte's
	// own rule (`node_modules/svelte`'s `transitions.js`: `run = !block ||
	// (block.f & EFFECT_RAN) !== 0`) — so a plain client-side
	// `<Presence open={true}>` mounting for the first time never dispatches
	// `introstart` either, the same as the hydration case. Hydration adds a
	// second, narrower reason for the identical outcome: `hydrate()` also
	// defaults `intro: false` (verified against `node_modules/svelte`'s own
	// `render.js`), so a route's first hydration skips the intro even for a
	// transition that WOULD otherwise qualify as non-initial. Either way,
	// `onintrostart` below flips this to "opening" synchronously as part of
	// any mount where an intro actually runs, so the visible default here
	// only shows through for the "no intro played" case both rules produce.
	let state = $state<"opening" | "open" | "closing">("open");

	/**
	 * The ONE transition function behind Presence's single `transition:`
	 * directive — never split into separate `in:`/`out:`, because Svelte's
	 * own reversal smoothing (a stale outro resuming as a fresh intro
	 * without a visual snap) only exists for a unified bidirectional
	 * `transition:` (verified in node_modules/svelte's transitions.js:
	 * `animate()` passes the in-flight counterpart's current position into a
	 * fresh call so a rapid `open` toggle reverses instead of jumping).
	 *
	 * It deliberately does NOT branch on `options.direction`: Svelte reports
	 * `direction: "both"` for every call made through a single `transition:`
	 * directive, on both the intro invocation and the outro invocation alike
	 * (same file, `var direction = is_both ? 'both' : ...`, computed once and
	 * reused for the life of this DOM node) — so `options.direction` cannot
	 * distinguish entering from leaving here at all. `open` can: Svelte only
	 * ever calls this function because `open` just became true (mounting,
	 * about to intro) or just became false (unmounting, about to outro), so
	 * reading it fresh at call time IS the real direction signal.
	 */
	function presenceTransition(
		node: Element,
		_params: unknown,
		_options?: { direction: "in" | "out" | "both" }
	): TransitionConfig {
		const entering = open;
		return makePreset(preset)(
			node,
			{
				duration: reduced.current ? 0 : entering ? duration : exitDuration,
				delay: reduced.current ? 0 : delay,
				distance: entering ? distance : distance / 2,
			},
			// A real "in"/"out" here (not the useless "both" Svelte itself
			// passed in) lets preset()'s own easing default do the right
			// thing — arrival curve entering, departure curve leaving —
			// without this file needing to import or hardcode either one.
			{ direction: entering ? "in" : "out" }
		);
	}

	function handleIntroStart() {
		state = "opening";
	}

	function handleIntroEnd() {
		state = "open";
		onEnterEnd?.();
	}

	function handleOutroStart() {
		state = "closing";
		// Svelte sets `element.inert = true` itself, synchronously, immediately
		// before dispatching this very event (verified in transitions.js) —
		// the `inert` prop's `true` default is exactly that native behavior,
		// free. There is no "don't do this" flag Svelte exposes, so the
		// `inert={false}` opt-out has to override it right here: the one place
		// guaranteed to run after Svelte's own assignment and before the exit
		// paints a frame.
		if (!inert && ref) ref.inert = false;
	}

	function handleOutroEnd() {
		// Restores the same honest default `state` starts at (line above) —
		// without this, a completed close leaves `state` sitting at "closing"
		// (nothing else ever resets it), so the NEXT `open = true` would
		// create the node already carrying `data-state="closing"` for one
		// microtask before the intro handler corrects it. The correction
		// lands before paint either way, but there's no reason to leave a
		// wrong value sitting in `state` between closes.
		state = "open";
		onExitEnd?.();
	}
</script>

{#if open}
	<div
		bind:this={ref}
		class={cn("ft-presence", className)}
		{...restProps}
		data-state={state}
		transition:presenceTransition
		onintrostart={handleIntroStart}
		onintroend={handleIntroEnd}
		onoutrostart={handleOutroStart}
		onoutroend={handleOutroEnd}
	>
		{@render children()}
	</div>
{/if}
