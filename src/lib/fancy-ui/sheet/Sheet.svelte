<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type SheetSide = "left" | "right" | "top" | "bottom";
	export type SheetSize = "sm" | "md" | "lg";

	export interface SheetProps {
		/** Whether the sheet is open; bindable. */
		open?: boolean;
		/** Called with the new value whenever the sheet opens or closes. */
		onOpenChange?: (open: boolean) => void;
		/** Edge of the viewport the panel slides in from. */
		side?: SheetSide;
		/** Heading rendered in the header and wired to `aria-labelledby`. */
		title?: string;
		/** Supporting text under the title, wired to `aria-describedby`. */
		description?: string;
		/** Whether Escape, the scrim and the close button can close the sheet. */
		dismissible?: boolean;
		/** Panel width (left/right sides) or height (top/bottom sides). */
		size?: SheetSize;
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
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { lockScroll } from "../_internals/scroll-lock.js";

	let {
		open = $bindable(false),
		onOpenChange,
		side = "right",
		title,
		description,
		dismissible = true,
		size = "md",
		children,
		footer,
		class: className,
		ref = $bindable(null),
	}: SheetProps = $props();

	// One seed per instance, suffixed for title/description — same approach
	// FormField settled on: $props.id() is SSR-stable (uid() from
	// _internals/id.ts is not, and this can render on the server the moment a
	// caller flips `open` true during SSR).
	const uid = $props.id();
	const titleId = $derived(title ? `${uid}-title` : undefined);
	const descriptionId = $derived(description ? `${uid}-description` : undefined);

	function close() {
		if (!open) return;
		open = false;
		onOpenChange?.(false);
	}

	// Acquired the instant the sheet opens, released the instant it closes or
	// unmounts — lockScroll() is reference-counted on its own side, so a
	// second overlay opening/closing on top of this one never fights it.
	$effect(() => {
		if (!open) return;
		const release = lockScroll();
		return release;
	});

	const POSITION_CLASSES: Record<SheetSide, string> = {
		left: "inset-y-0 left-0 border-r border-border",
		right: "inset-y-0 right-0 border-l border-border",
		top: "inset-x-0 top-0 border-b border-border",
		bottom: "inset-x-0 bottom-0 border-t border-border",
	};

	// Literal Tailwind class strings (not template-built at runtime) so the
	// Tailwind v4 source scanner — which reads this file as text, not as
	// evaluated JS — can see every candidate class it needs to generate.
	const WIDTH_CLASSES: Record<SheetSize, string> = {
		sm: "w-[20rem] max-w-[90vw] h-dvh",
		md: "w-[24rem] max-w-[90vw] h-dvh",
		lg: "w-[32rem] max-w-[90vw] h-dvh",
	};
	const HEIGHT_CLASSES: Record<SheetSize, string> = {
		sm: "h-[14rem] max-h-[85vh] w-full",
		md: "h-[18rem] max-h-[85vh] w-full",
		lg: "h-[24rem] max-h-[85vh] w-full",
	};

	const isHorizontal = $derived(side === "left" || side === "right");
	const dimensionClasses = $derived(isHorizontal ? WIDTH_CLASSES[size] : HEIGHT_CLASSES[size]);

	const panelClasses = $derived(
		cn(
			"ft-sheet-panel bg-popover text-popover-foreground fixed z-50 flex flex-col gap-4 p-4 shadow-2xl",
			POSITION_CLASSES[side],
			dimensionClasses,
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
	<div class="ft-sheet-scrim fixed inset-0 z-50 bg-black/60" use:portal aria-hidden="true"></div>
	<div
		bind:this={ref}
		class={panelClasses}
		data-side={side}
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		aria-describedby={descriptionId}
		use:portal
		use:focusTrap
		use:dismissable={{ onDismiss: close, escape: dismissible, outsideClick: dismissible }}
	>
		{#if title || dismissible}
			<div class="ft-sheet-header flex items-start justify-between gap-4">
				{#if title}
					<h2 id={titleId} class="text-[15px] font-semibold">{title}</h2>
				{/if}
				{#if dismissible}
					<button
						type="button"
						class="ft-sheet-close text-muted-foreground hover:text-foreground cursor-pointer text-[13px] leading-none"
						aria-label="Close"
						onclick={close}
					>
						✕
					</button>
				{/if}
			</div>
		{/if}
		{#if description}
			<p id={descriptionId} class="text-muted-foreground text-[12.5px] leading-relaxed">
				{description}
			</p>
		{/if}
		<div class="ft-sheet-body flex flex-1 flex-col gap-3 overflow-y-auto">
			{@render children?.()}
		</div>
		{#if footer}
			<div class="ft-sheet-footer flex justify-end gap-2">
				{@render footer()}
			</div>
		{/if}
	</div>
{/if}

<style>
	/*
	 * Resting position is a plain, unconditional rule — the sheet is fully
	 * on-screen with or without the entrance animation below. Only the "from"
	 * offset lives inside the reduced-motion gate, so a panel that only
	 * becomes visible via the animation never disappears when motion is
	 * turned off; it simply appears in place instead of sliding into place.
	 */
	.ft-sheet-panel {
		transform: translate(0, 0);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-sheet-panel[data-side="left"] {
			animation: ft-sheet-in-left 0.22s ease-out;
		}
		.ft-sheet-panel[data-side="right"] {
			animation: ft-sheet-in-right 0.22s ease-out;
		}
		.ft-sheet-panel[data-side="top"] {
			animation: ft-sheet-in-top 0.22s ease-out;
		}
		.ft-sheet-panel[data-side="bottom"] {
			animation: ft-sheet-in-bottom 0.22s ease-out;
		}
		.ft-sheet-scrim {
			animation: ft-sheet-scrim-in 0.22s ease-out;
		}
	}

	@keyframes ft-sheet-in-left {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
	@keyframes ft-sheet-in-right {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}
	@keyframes ft-sheet-in-top {
		from {
			transform: translateY(-100%);
		}
		to {
			transform: translateY(0);
		}
	}
	@keyframes ft-sheet-in-bottom {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	@keyframes ft-sheet-scrim-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
