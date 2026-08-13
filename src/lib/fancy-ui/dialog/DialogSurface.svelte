<script lang="ts" module>
	import type { DialogSurfaceProps } from "./types.js";
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { lockScroll } from "../_internals/scroll-lock.js";

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

	// Reference-counted: acquired the instant this surface opens, released
	// the instant it closes or unmounts. `lockScroll()`'s return value is an
	// `$effect` cleanup, which Svelte guarantees runs exactly once per
	// acquisition — before the effect re-runs on `open` flipping, and on
	// destroy — so nested overlays (a Popover opened from inside this
	// dialog acquiring its own lock on top of this one) never lose track of
	// how many locks are outstanding.
	$effect(() => {
		if (!open) return;
		return lockScroll();
	});
</script>

{#if open}
	<div use:portal class="ft-dialog-scrim fixed inset-0 z-50 bg-black/60" aria-hidden="true"></div>
	<!--
		`use:portal` runs first and reparents this node to `document.body`
		before `use:focusTrap` mounts — both actions live on this one element
		specifically so their order is guaranteed by declaration order, not by
		however Svelte happens to schedule effects across a parent/child pair.
		Getting this backwards (portal on an ancestor, focus-trap on a
		descendant) let the trap call `.focus()` on a node that was not yet
		attached to `document` — a silent no-op that left focus on `body`
		instead of the panel.
	-->
	<div
		bind:this={ref}
		use:portal
		use:focusTrap={{ initialFocus, fallbackFocus }}
		use:dismissable={{ onDismiss, escape, outsideClick, exclude }}
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
	 * No base `opacity: 0` outside the media query: the resting state is
	 * always fully visible, so a visitor with motion reduced sees the panel
	 * appear immediately rather than staying invisible for the animation
	 * that never runs.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-dialog-panel {
			animation: ft-dialog-panel-in 0.15s ease-out;
		}

		.ft-dialog-scrim {
			animation: ft-dialog-scrim-in 0.15s ease-out;
		}
	}

	@keyframes ft-dialog-scrim-in {
		from {
			opacity: 0;
		}
	}

	/*
	 * The panel's resting transform centers it (`translate(-50%, -50%)` off
	 * `top-1/2 left-1/2`) — this keyframe's `from` keeps that same
	 * translate and only animates opacity and scale on top of it, so the
	 * panel eases in from a hair smaller without ever jumping position.
	 */
	@keyframes ft-dialog-panel-in {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.96);
		}
	}
</style>
