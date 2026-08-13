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
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { lockScroll } from "../_internals/scroll-lock.js";

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

	function close() {
		if (!open) return;
		open = false;
		onOpenChange?.(false);
	}

	// Acquired the instant the drawer opens, released the instant it closes
	// or unmounts — lockScroll() is reference-counted on its own side, so a
	// second overlay opening/closing on top of this one never fights it.
	$effect(() => {
		if (!open) return;
		const release = lockScroll();
		return release;
	});

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
			dragY = 0;
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
	-->
	<div class="ft-drawer-scrim fixed inset-0 z-50 bg-black/60" use:portal aria-hidden="true"></div>
	<div
		bind:this={ref}
		class={panelClasses}
		style:transform="translateY({dragY}px)"
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		aria-describedby={descriptionId}
		use:portal
		use:focusTrap
		use:dismissable={{ onDismiss: close, escape: dismissible, outsideClick: dismissible }}
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
	 * Resting position is a plain, unconditional rule — the drawer is fully
	 * on-screen with or without the entrance animation below, so a panel
	 * that only becomes visible via the animation never disappears when
	 * motion is turned off.
	 */
	.ft-drawer-panel {
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-drawer-panel {
			animation: ft-drawer-in 0.22s ease-out;
		}
		.ft-drawer-scrim {
			animation: ft-drawer-scrim-in 0.22s ease-out;
		}
		/*
		 * The only place a transition ever touches `transform`: a released
		 * drag that fell short of the dismiss threshold. Live dragging
		 * itself never carries this class, so the panel tracks the pointer
		 * with no lag; only the snap-back afterwards eases.
		 */
		.ft-drawer-panel--releasing {
			transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
		}
	}

	@keyframes ft-drawer-in {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	@keyframes ft-drawer-scrim-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
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
