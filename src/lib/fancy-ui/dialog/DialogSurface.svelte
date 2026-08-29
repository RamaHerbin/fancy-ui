<script lang="ts" module>
	import type { DialogSurfaceProps } from "./types.js";
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { scrollLock } from "../_internals/scroll-lock.js";
	import { anchored, markSurfaceState } from "../_internals/motion/anchored.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";

	let {
		open,
		role,
		titleId,
		descriptionId,
		escape,
		outsideClick,
		onDismiss,
		initialFocus = null,
		fallbackFocus,
		exclude,
		panelClass,
		children,
		ref = $bindable(null),
	}: DialogSurfaceProps = $props();

	// Handed over by `focusTrap` the moment the trap arms; called at
	// `outrostart`, which is the dismiss instant on EVERY close path (Escape,
	// outside click, the close button, a caller's own `bind:open` write).
	// Waiting for the trap's own `destroy()` would leave a keyboard user on
	// `<body>` for the whole length of the fade, because Svelte sets `inert`
	// on this panel the instant the exit starts.
	let returnFocusNow: (() => void) | null = null;

	// The other half of that handover, called at `introstart`. A dialog
	// reopened DURING its 200 ms fade reverses the outro instead of
	// remounting, so `use:focusTrap` is never re-created: without this the
	// panel would come back `aria-modal` and interactive with focus left on
	// the trigger behind it, Tab walking the page rather than the panel, and
	// the eager return already spent for the life of the instance.
	let rearmFocusTrap: (() => void) | null = null;

	function handleIntroStart(event: Event) {
		markSurfaceState(event, "open");
		rearmFocusTrap?.();
	}

	function handleOutroStart(event: Event) {
		markSurfaceState(event, "closing");
		returnFocusNow?.();
	}
</script>

{#if open}
	<!--
		The scrim fades on opacity alone (`scale: false`) — a full-viewport
		fixed element has no business acquiring a compositing layer for a
		transform it does not use. It shares the panel's clock exactly, so the
		two leave together and Svelte's "destroy the branch when the LAST
		transition finishes" rule is a tie rather than a straggler.
	-->
	<div
		use:portal
		class="ft-dialog-scrim fixed inset-0 z-50 bg-black/60"
		aria-hidden="true"
		transition:anchored={{
			entering: open,
			scale: false,
			duration: DURATIONS.base,
			exitDuration: DURATIONS.exit,
		}}
	></div>
	<!--
		`use:portal` runs first and reparents this node to `document.body`
		before `use:focusTrap` mounts — both actions live on this one element
		specifically so their order is guaranteed by declaration order, not by
		however Svelte happens to schedule effects across a parent/child pair.
		Getting this backwards (portal on an ancestor, focus-trap on a
		descendant) let the trap call `.focus()` on a node that was not yet
		attached to `document` — a silent no-op that left focus on `body`
		instead of the panel.

		`use:scrollLock` sits here rather than on the scrim, and is an action
		rather than an `$effect`, for the release timing: an action's
		`destroy()` is delayed by the outro, so the page stays locked until
		the backdrop is actually gone instead of unlocking the instant `open`
		flips and leaving the page scrollable under a scrim still on screen.

		ONE bidirectional `transition:` directive, never a split `in:`/`out:`
		pair: a bidirectional directive passes the in-flight counterpart's
		current position into the fresh call, so a dialog reopened mid-exit
		continues from where it is instead of snapping to invisible first.
		`entering: open` is what tells the transition which way it is going —
		Svelte reports `direction: "both"` for a bidirectional directive,
		which cannot distinguish the two on its own, and the params are read
		fresh (and outside any reactive context) at the moment each direction
		starts.

		`data-state` is a STATIC literal, changed only by `markSurfaceState`
		from the two handlers below. Svelte marks this branch inert before it
		plays the outro and the scheduler skips inert effects, so a reactive
		`data-state={…}` would never reach the DOM on a real close. `inert`
		itself is not written by hand: Svelte sets it on any element carrying
		a `transition:` for the whole exit, which is exactly what a closing
		modal wants.
	-->
	<div
		bind:this={ref}
		{role}
		aria-modal="true"
		aria-labelledby={titleId}
		aria-describedby={descriptionId}
		tabindex="-1"
		class={cn(
			"ft-dialog-panel border-border bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border p-5 shadow-2xl",
			"focus-visible:outline-none",
			panelClass
		)}
		use:portal
		use:scrollLock
		use:focusTrap={{
			initialFocus,
			fallbackFocus,
			onActivate: (returnNow, rearm) => {
				returnFocusNow = returnNow;
				rearmFocusTrap = rearm;
			},
		}}
		use:dismissable={{ onDismiss, escape, outsideClick, exclude, active: () => open }}
		transition:anchored={{
			entering: open,
			duration: DURATIONS.base,
			exitDuration: DURATIONS.exit,
		}}
		data-state="open"
		onintrostart={handleIntroStart}
		onoutrostart={handleOutroStart}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	/*
	 * The brand accent has no semantic Tailwind token, so it is a scoped
	 * custom property with a light-dark() fallback — the same shape Button's
	 * own `--ft-btn-accent` uses. Named for the category rather than this one
	 * component: every overlay in this wave (Dialog, AlertDialog, Popover,
	 * Tooltip, ...) reads the same `--ft-overlay-accent`, so retinting one
	 * `--ft-accent` up the tree moves every overlay's focus ring together.
	 * Set on the panel, not a wrapper: the custom property still inherits to
	 * every descendant that reads it (Dialog's close button, for one), and
	 * scoping it here means a page with no open dialog pays nothing for it.
	 */
	.ft-dialog-panel {
		--ft-overlay-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	/*
	 * No `@keyframes` and no `@media (prefers-reduced-motion)` block here any
	 * more: both surfaces are driven by the shared JS transition above, which
	 * collapses its own duration to 0 when the user has asked for reduced
	 * motion — Svelte then skips `element.animate()` entirely and the dialog
	 * appears and disappears instantly, with the close staying synchronous.
	 *
	 * The keyframes this replaced also carried a bug worth naming: the panel's
	 * `from` restated `translate(-50%, -50%)` as a `transform`, on a node
	 * whose centring comes from Tailwind v4's separate `translate` property.
	 * The two composed, so the panel drifted in from half its own size up and
	 * to the left. `transform: scale(…)` alone composes after `translate` and
	 * scales the panel about its own centre without touching the centring.
	 */
</style>
