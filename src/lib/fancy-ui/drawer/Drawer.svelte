<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface DrawerProps {
		/** Whether the drawer is open; bindable. */
		open?: boolean;
		/** Called with the new value whenever the drawer opens or closes. */
		onOpenChange?: (open: boolean) => void;
		/** Heading rendered in the header and wired to `aria-labelledby`. */
		title?: string;
		/** Supporting text under the title, wired to `aria-describedby`. */
		description?: string;
		/** Whether Escape, the scrim and the close button can close the drawer. */
		dismissible?: boolean;
		/** Whether dragging the handle down past the threshold closes the drawer. */
		swipeToClose?: boolean;
		/** Panel body content. */
		children?: Snippet;
		/** Content pinned below the body, e.g. actions. */
		footer?: Snippet;
		/** Additional CSS classes merged onto the panel. */
		class?: string;
		/** Bindable element reference to the panel. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { onDestroy } from "svelte";
	import type { TransitionConfig } from "svelte/transition";
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { scrollLock } from "../_internals/scroll-lock.js";
	import {
		anchored,
		markSurfaceState,
		prefersReducedMotion,
	} from "../_internals/motion/anchored.js";
	import { DURATIONS, JS_EASINGS } from "../_internals/motion/tokens.js";

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		dismissible = true,
		swipeToClose = true,
		children,
		footer,
		class: className,
		ref = $bindable(null),
	}: DrawerProps = $props();

	// Fixed pixel distance rather than a percentage of the panel's own
	// height: the panel's rendered height depends on its content, so a
	// percentage threshold would make the same physical drag distance close
	// the drawer sometimes and not others. A flat distance also keeps the
	// gesture's tests deterministic without needing real layout from jsdom.
	const DISMISS_THRESHOLD_PX = 96;
	// Matches the transition-duration on `.ft-drawer-panel--releasing` below.
	const SPRING_BACK_MS = 200;

	// One seed per instance, suffixed for title/description — SSR-stable
	// (uid() from _internals/id.ts is not, and a caller can flip `open` true
	// on first render).
	const uid = $props.id();
	const titleId = $derived(title ? `${uid}-title` : undefined);
	const descriptionId = $derived(description ? `${uid}-description` : undefined);

	// Where the exit starts from. Captured in `close()` rather than in the
	// drag handler so EVERY close path sets it — a scrim click, Escape and
	// the close button all leave `dragY` at 0, which is the resting position,
	// and a past-threshold release leaves it wherever the finger did. One
	// assignment, one meaning: "the panel is here now; take it from here."
	let exitFromY = 0;

	function close() {
		if (!open) return;
		exitFromY = dragY;
		open = false;
		onOpenChange?.(false);
	}

	// Swiping is a second way to trigger the same `dismissible` decision the
	// close button, scrim and Escape already respect — a drawer marked
	// non-dismissible can't be swiped away either, only closed
	// programmatically by the caller.
	const canSwipe = $derived(dismissible && swipeToClose);

	// `dragY` is a live pixel offset applied as an inline transform while a
	// pointer drag is in progress; it is not layout (no height/top changes),
	// so dragging never triggers reflow of the page behind the drawer.
	let dragY = $state(0);
	let dragging = $state(false);
	// True for the short window after a released drag springs back to 0 —
	// the only time a transition is applied to `transform`, so live dragging
	// itself always tracks the pointer with zero lag.
	let releasing = $state(false);
	let activePointerId: number | null = null;
	let dragStartY = 0;
	let springBackTimer: ReturnType<typeof setTimeout> | undefined;

	// The drag offset is deliberately NOT zeroed on a past-threshold release
	// (see `handlePointerUp`) — it is the exit's start point. It cannot be
	// cleared inside the closing block either: Svelte marks that branch inert
	// before it plays the outro, so the `style:transform` write would never
	// reach the DOM. The reset therefore happens on the way back IN, from an
	// effect that lives outside the block, and lands before paint. Without it
	// a drawer swiped shut would reopen already pushed down by the last
	// swipe's distance.
	$effect(() => {
		if (open) dragY = 0;
	});

	// A drag released below the threshold arms this timer (see
	// `handlePointerUp`/`handlePointerCancel`); if the drawer unmounts before
	// it fires — closed by its own trigger, or the whole overlay removed some
	// other way — nothing would otherwise clear it.
	onDestroy(() => {
		clearTimeout(springBackTimer);
	});

	function handlePointerDown(event: PointerEvent) {
		if (!canSwipe) return;
		if (event.pointerType === "mouse" && event.button !== 0) return;
		clearTimeout(springBackTimer);
		activePointerId = event.pointerId;
		dragStartY = event.clientY;
		dragging = true;
		releasing = false;
		// Keeps receiving pointermove/pointerup on this element even if the
		// pointer strays outside it mid-drag (a fast, slightly diagonal
		// swipe easily leaves a few-pixel-tall handle row).
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging || event.pointerId !== activePointerId) return;
		// Only downward drag moves the panel; upward movement clamps at 0
		// rather than lifting the drawer past its resting position.
		dragY = Math.max(0, event.clientY - dragStartY);
	}

	function releaseCapture(event: PointerEvent) {
		(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
	}

	function handlePointerUp(event: PointerEvent) {
		if (!dragging || event.pointerId !== activePointerId) return;
		dragging = false;
		activePointerId = null;
		releaseCapture(event);

		if (dragY > DISMISS_THRESHOLD_PX) {
			// `dragY` is NOT zeroed here. Zeroing it used to be harmless
			// because removal was instant; with an exit it would snap the
			// panel back up to rest and then slide it down — two gestures
			// where the user made one. `close()` captures the offset as the
			// exit's start point instead, so the slide-out carries on from
			// exactly where the finger let go.
			close();
			return;
		}

		// Below the threshold: spring back rather than sticking wherever the
		// pointer let go — `releasing` arms the transition that animates
		// `dragY`'s jump back to 0 (skipped entirely under reduced motion,
		// where it simply snaps).
		releasing = true;
		dragY = 0;
		springBackTimer = setTimeout(() => {
			releasing = false;
		}, SPRING_BACK_MS);
	}

	function handlePointerCancel(event: PointerEvent) {
		if (!dragging || event.pointerId !== activePointerId) return;
		dragging = false;
		activePointerId = null;
		releaseCapture(event);
		releasing = true;
		dragY = 0;
		springBackTimer = setTimeout(() => {
			releasing = false;
		}, SPRING_BACK_MS);
	}

	// Handed over by `focusTrap` the moment the trap arms; called at
	// `outrostart`, which is the dismiss instant on EVERY close path (Escape,
	// the scrim, the close button, a past-threshold swipe, a caller's own
	// `bind:open` write). Waiting for the trap's own `destroy()` would leave a
	// keyboard user on `<body>` for the whole length of the slide-out, because
	// Svelte sets `inert` on this panel the instant the exit starts.
	let returnFocusNow: (() => void) | null = null;

	// The other half of that handover, called at `introstart`. A drawer
	// reopened DURING its exit reverses the outro instead of remounting, so
	// `use:focusTrap` is never re-created: without this the panel would come
	// back `aria-modal` and interactive with focus left on the trigger behind
	// it, and the eager return already spent for the life of the instance.
	let rearmFocusTrap: (() => void) | null = null;

	function handleIntroStart(event: Event) {
		markSurfaceState(event, "open");
		rearmFocusTrap?.();
	}

	function handleOutroStart(event: Event) {
		markSurfaceState(event, "closing");
		returnFocusNow?.();
	}

	// The one place this component owns motion, and the other half of the
	// swipe gesture. Not `anchored`: that helper is scale+opacity by design
	// and carries no translate term, and a drawer's whole gesture is travel.
	// Not a pixel distance either — the panel's height depends on its
	// content, and only `%` clears its own edge whatever that height is.
	//
	// The exit does not halve its travel the way the scale rung does: a
	// drawer that slid half-way down and then vanished reads worse than one
	// that simply leaves. A named exception, not an oversight.
	//
	// `from` is where the panel is at the instant the exit starts — 0 for
	// every close path except a past-threshold swipe, which hands over
	// wherever the finger let go. At `t = 1` the panel sits exactly there; at
	// `t = 0` it is a full height below the viewport. One continuous motion
	// rather than a snap back followed by a slide. On the way in `from` is
	// always 0: an entrance starts off-screen and ends at rest, and a stale
	// offset from an earlier swipe must not become the resting position.
	function drawerSlide(_node: Element, params: { entering: boolean }): TransitionConfig {
		const reduced = prefersReducedMotion();
		const entering = params.entering;
		const from = entering ? 0 : exitFromY;
		return {
			// Reduced motion collapses this to 0, which makes Svelte call
			// `on_finish()` synchronously and never touch `element.animate()` —
			// so the close is exactly as synchronous as it was before the
			// drawer animated out at all.
			duration: reduced ? 0 : entering ? DURATIONS.base : DURATIONS.exit,
			easing: entering ? JS_EASINGS.out : JS_EASINGS.in,
			css: (t, u) => `transform: translateY(calc(${from}px * ${t} + 100% * ${u}))`,
		};
	}

	const panelClasses = $derived(
		cn(
			"ft-drawer-panel bg-popover text-popover-foreground fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col gap-3 rounded-t-[14px] border-t border-r border-l border-border pt-3.5 pr-5 pb-5 pl-5 shadow-2xl",
			releasing && "ft-drawer-panel--releasing",
			className
		)
	);
</script>

{#if open}
	<!--
	  Each top-level node is portalled independently rather than sharing one
	  portal-wrapper div around both. Actions on a node only run once that
	  node is fully built, but a *child's* action can still run before its
	  *parent's* — so a focus-trap action nested inside a portal wrapper would
	  try to focus into a subtree that the wrapper's own portal action has not
	  relocated into `document.body` yet, and `.focus()` on a still-detached
	  element is a silent no-op. Putting `use:portal` directly on this panel,
	  ahead of `use:focusTrap` in source order, guarantees the panel is
	  already attached to the document by the time focus-trap tries to focus
	  into it.

	  The scrim fades on opacity alone (`scale: false`) while the panel
	  travels, and both run the same clock, so they leave together and
	  Svelte's "destroy the branch when the LAST transition finishes" rule is
	  a tie rather than a straggler.
	-->
	<div
		class="ft-drawer-scrim fixed inset-0 z-50 bg-black/60"
		use:portal
		aria-hidden="true"
		transition:anchored={{
			entering: open,
			scale: false,
			duration: DURATIONS.base,
			exitDuration: DURATIONS.exit,
		}}
	></div>
	<!--
	  `use:scrollLock` sits here rather than on the scrim, and is an action
	  rather than an `$effect`, for the release timing: an action's
	  `destroy()` is delayed by the outro, so the page stays locked until the
	  panel has actually finished sliding out instead of unlocking the instant
	  `open` flips and leaving the page scrollable under a scrim still on
	  screen.

	  ONE bidirectional `transition:` directive, never a split `in:`/`out:`
	  pair: a bidirectional directive passes the in-flight counterpart's
	  current position into the fresh call, so a drawer reopened mid-exit
	  continues from where it is instead of snapping off-screen first.

	  `style:transform` still carries the live drag offset, and the two never
	  fight: a running animation wins over an inline style, so the transition
	  owns `transform` for the whole exit and hands back to the inline value
	  only once it is finished — by which point the panel is gone. The offset
	  is frozen for the length of the exit anyway, because Svelte marks this
	  branch inert before playing the outro and the scheduler skips inert
	  effects. `data-state` is a STATIC literal for the same reason, changed
	  only by `markSurfaceState` from the two handlers below; `inert` is not
	  written by hand, because Svelte sets it on any element carrying a
	  `transition:` for the whole exit.
	-->
	<div
		bind:this={ref}
		class={panelClasses}
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		aria-describedby={descriptionId}
		use:portal
		use:scrollLock
		use:focusTrap={{
			onActivate: (returnNow, rearm) => {
				returnFocusNow = returnNow;
				rearmFocusTrap = rearm;
			},
		}}
		use:dismissable={{
			onDismiss: close,
			escape: dismissible,
			outsideClick: dismissible,
			active: () => open,
		}}
		transition:drawerSlide={{ entering: open }}
		data-state="open"
		style:transform="translateY({dragY}px)"
		onintrostart={handleIntroStart}
		onoutrostart={handleOutroStart}
	>
		<div
			class="ft-drawer-drag-surface flex flex-col items-center gap-2 pb-1"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerCancel}
		>
			<span class="ft-drawer-handle" aria-hidden="true"></span>
			{#if title}
				<h2 id={titleId} class="w-full text-[14px] font-semibold">{title}</h2>
			{/if}
			{#if description}
				<p id={descriptionId} class="text-muted-foreground w-full text-[12px] leading-relaxed">
					{description}
				</p>
			{/if}
		</div>
		{#if dismissible}
			<button
				type="button"
				class="ft-drawer-close text-muted-foreground hover:text-foreground absolute top-3.5 right-5 cursor-pointer text-[13px] leading-none"
				aria-label="Close"
				onclick={close}
			>
				✕
			</button>
		{/if}
		<div class="ft-drawer-body flex flex-1 flex-col gap-3 overflow-y-auto">
			{@render children?.()}
		</div>
		{#if footer}
			<div class="ft-drawer-footer flex justify-end gap-2">
				{@render footer()}
			</div>
		{/if}
	</div>
{/if}

<style>
	/*
	 * The entrance and its resting rule used to live here as keyframes; both
	 * are now the JS transition in the script above, which emits no
	 * transform at rest and collapses to zero duration under reduced motion.
	 * What survives is the spring-back, which is a different interaction on
	 * a different curve.
	 */
	@media (prefers-reduced-motion: no-preference) {
		/*
		 * The only place a CSS transition ever touches `transform`: a
		 * released drag that fell short of the dismiss threshold. Live
		 * dragging itself never carries this class, so the panel tracks the
		 * pointer with no lag; only the snap-back afterwards eases. A drag
		 * released PAST the threshold never carries it either — that one is
		 * handed to the exit transition instead, from wherever the finger
		 * let go.
		 */
		.ft-drawer-panel--releasing {
			transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
		}
	}

	.ft-drawer-drag-surface {
		/*
		 * Without this, a touch drag starting on the handle is first
		 * interpreted by the browser as a page-scroll/pan gesture: it both
		 * withholds the continuous pointermove stream our handler needs and
		 * fights our transform with the browser's own scroll offset.
		 * Pointer capture alone does not stop that tug-of-war — only
		 * touch-action does.
		 */
		touch-action: none;
		cursor: grab;
	}

	.ft-drawer-handle {
		width: 40px;
		height: 4px;
		border-radius: 2px;
		background-color: var(--color-border, rgba(255, 255, 255, 0.2));
	}
</style>
