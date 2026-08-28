<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { HapticPattern } from "../_internals/motion/types.js";

	/**
	 * Props for Pressable.
	 *
	 * Pressable wraps exactly one interactive child (a `<button>`, an `<a>`,
	 * or anything that already owns its own role and keyboard handling) and
	 * gives it a consistent, cross-browser press animation. It supersedes a
	 * hand-rolled `:active` style — see the README before pairing the two.
	 */
	export interface PressableProps extends Omit<
		HTMLAttributes<HTMLDivElement>,
		| "class"
		| "onpointerdown"
		| "onpointerup"
		| "onpointercancel"
		| "onpointerleave"
		| "onfocusout"
		| "onkeydown"
		| "onkeyup"
	> {
		/** Additional CSS classes. */
		class?: string;
		/** How far the wrapper shrinks while pressed, as a CSS `scale()` factor. */
		scale?: number;
		/**
		 * Touch-only haptic pattern fired on `pointerdown`. `false` (the
		 * default) never vibrates — this is an opt-in, additive effect, never
		 * a required one.
		 */
		haptic?: false | HapticPattern;
		/** Suppresses every listener; the wrapper never sets `data-pressed`. */
		disabled?: boolean;
		/** Exactly one interactive child. Not enforced at runtime — documented only. */
		children: Snippet;
		/** The wrapper element. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { canVibrate, vibrate } from "../_internals/motion/haptics.js";

	const DEFAULT_SCALE = 0.97;

	let {
		scale = DEFAULT_SCALE,
		haptic = false,
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
		...restProps
	}: PressableProps = $props();

	// Plain `$state`, not a media-query-gated one: the press *state* always
	// tracks pointer/keyboard activity regardless of `prefers-reduced-motion`.
	// Only the CSS transition that animates `[data-pressed]` is gated (see the
	// style block below) — reduced motion swaps a moving scale for a static
	// opacity change, it never turns press tracking off.
	let pressed = $state(false);

	// The keydown branch (not the keyup one — see below) only arms on a key
	// that actually landed inside this wrapper's own subtree. Because the
	// listener itself lives on `.ft-pressable` and DOM events only reach a
	// listener via the bubble phase, `event.target` is already guaranteed to
	// be the root or one of its descendants for every event that gets here —
	// this check is a second, explicit guarantee of that fact (and the thing
	// the "target outside the wrapper" test asserts against), not a
	// document-level listener that needs it to survive.
	function isInsideRoot(target: EventTarget | null): boolean {
		return !!ref && target instanceof Node && ref.contains(target);
	}

	function press() {
		if (!disabled) pressed = true;
	}

	function release() {
		pressed = false;
	}

	// `disabled` can flip true mid-press (a "Save" handler disabling its own
	// button on submit), and the control that just went disabled is not
	// guaranteed to deliver the pointerup/focusout that would normally
	// release: Firefox sends no pointerup to a control disabled under the
	// pointer, and a click that never focused the button (macOS Safari) sends
	// no focusout either. The CSS `:not([data-disabled])` guard only HIDES the
	// pressed styling for as long as `disabled` stays true — clearing the
	// state here is what keeps a later re-enable (an async save resolving)
	// from revealing a stale `data-pressed` that no live press is behind.
	$effect(() => {
		if (disabled) release();
	});

	function handlePointerDown(event: PointerEvent) {
		if (disabled) return;
		// Mirrors this repo's own Drawer.svelte precedent: a non-primary
		// mouse button (right-click, middle-click) is not "a press". Touch
		// and pen contacts always report `button === 0`, so this only ever
		// filters the mouse case.
		if (event.pointerType === "mouse" && event.button !== 0) return;
		press();
		// Fired inside the same gesture that set `data-pressed`, never
		// deferred — `navigator.vibrate` requires an active user-activation
		// context. Touch only: a stylus press is not a "tap" in the sense a
		// haptic buzz confirms, and most styli have no motor of their own to
		// conflate with the device's.
		if (haptic && event.pointerType === "touch" && canVibrate()) vibrate(haptic);
	}

	function handlePointerRelease() {
		release();
	}

	function handleFocusOut() {
		release();
	}

	function isActivationKey(key: string): boolean {
		return key === " " || key === "Enter";
	}

	function handleKeyDown(event: KeyboardEvent) {
		// OS key-repeat fires `keydown` continuously while a key stays held;
		// without this guard a held Enter/Space would keep "re-pressing" at
		// repeat rate, retriggering the haptic-free but still-pointless
		// animation restart on every tick.
		if (disabled || event.repeat) return;
		if (!isActivationKey(event.key)) return;
		if (!isInsideRoot(event.target)) return;
		press();
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.repeat) return;
		if (!isActivationKey(event.key)) return;
		release();
	}
</script>

<div
	bind:this={ref}
	class={cn("ft-pressable", className)}
	{...restProps}
	style:--ft-pressable-scale={scale === DEFAULT_SCALE ? undefined : scale}
	data-pressed={pressed ? "true" : undefined}
	data-disabled={disabled ? "true" : undefined}
	onpointerdown={handlePointerDown}
	onpointerup={handlePointerRelease}
	onpointercancel={handlePointerRelease}
	onpointerleave={handlePointerRelease}
	onfocusout={handleFocusOut}
	onkeydown={handleKeyDown}
	onkeyup={handleKeyUp}
>
	{@render children()}
</div>

<style>
	.ft-pressable {
		display: inline-flex;
		/* Removes the ~300ms tap delay and double-tap-zoom on touch without
		   blocking pan/scroll the way `touch-action: none` would — a card in
		   a scrollable list must stay scrollable while it press-reacts. */
		touch-action: manipulation;
	}

	/* Universal fallback, declared ABOVE the `no-preference` block on
	   purpose: press feedback must survive reduced motion (a static opacity
	   change instead of a moving scale), and a UA that supports neither
	   motion-preference query below still needs *some* pressed affordance.
	   Ordinary cascade order — same selector, same specificity, later rule
	   wins — lets the `no-preference` block below override this back to
	   `opacity: 1` when motion is enabled, with no `!important` and no
	   duplicated guard.

	   `:not([data-disabled])`: belt-and-braces for the mid-press disable case
	   the `$effect` in the script block actually handles (it clears `pressed`
	   itself, so `data-pressed` is gone by the time that flush paints) —
	   this keeps a disabled wrapper from ever painting the pressed styling,
	   whatever order a UA delivers the events in. */
	.ft-pressable[data-pressed]:not([data-disabled]) {
		opacity: var(--ft-pressable-opacity, 0.85);
	}

	/* The scale itself, and the transition that animates it, both live inside
	   `no-preference` — reduced motion drops the moving part entirely rather
	   than playing it at zero duration, matching this collection's rule that
	   the resting state (here: `scale(1)`, unanimated) is the fallback.

	   The pressed rule also resets `opacity` back to `1` here: without it, a
	   no-preference press would both scale down AND fade via the fallback
	   rule above — two channels for one interaction, and the two would
	   desync on release since only the scale is transitioned. `opacity` is
	   deliberately NOT added to the transition list below — that would only
	   smooth the now-pointless fade rather than remove the second channel,
	   and R5 ("one idea per interaction") wants scale to be the only thing
	   that moves while motion is enabled. */
	@media (prefers-reduced-motion: no-preference) {
		.ft-pressable {
			transform: scale(1);
			/* Literal fallbacks: 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout */
			transition: transform var(--ft-pressable-duration, var(--ft-duration-fast, 150ms))
				var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
		}

		.ft-pressable[data-pressed]:not([data-disabled]) {
			transform: scale(var(--ft-pressable-scale, 0.97));
			opacity: 1;
		}
	}
</style>
