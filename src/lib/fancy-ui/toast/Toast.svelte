<script lang="ts" module>
	import type { ToastItem } from "./store.svelte.js";

	export interface ToastProps {
		/** The toast to render. */
		item: ToastItem;
		/** Additional classes for the toast panel. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { dismissToast, pauseToast, resumeToast } from "./store.svelte.js";
	import { preset } from "../_internals/motion/transitions.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";
	import { DURATIONS, JS_EASINGS } from "../_internals/motion/tokens.js";

	let { item, class: className, ref = $bindable(null) }: ToastProps = $props();

	// Entrance and exit are two SEPARATE directives, never one bidirectional
	// `transition:`. `<Toaster>`'s `{#each … (item.id)}` is keyed, which is the
	// whole reason a dismissed toast can animate out at all: its item block is
	// *paused* rather than destroyed, and this outro is what holds it on screen
	// for its last 200ms. A keyed each reports `direction: "both"` to a single
	// `transition:` function, though, and there is no local "am I entering?"
	// flag here to disambiguate it with — the trick `Presence` uses does not
	// apply, because a toast has no `open` boolean: its existence IS its open
	// state. Splitting the two is also what lets the exit be its own, shorter,
	// shallower gesture rather than the entrance played backwards — see the two
	// params objects on the root element below.
	//
	// The one thing the split costs is Svelte's reversal smoothing — a toast
	// interrupted mid-exit restarts instead of reversing — and that costs
	// nothing in practice: `toast()` never reuses an id, so the store can never
	// re-add a toast that is currently leaving. Do not "simplify" this back
	// into one directive.
	const slide = preset("fade-up");

	// Pause while *either* the pointer or focus is on the toast, and only
	// resume once *both* have left. Two independent booleans instead of one
	// shared flag: hovering with the mouse while also tabbing through the
	// toast's buttons (or the reverse) must not resume the countdown just
	// because one of the two let go first — `pauseToast`/`resumeToast` are
	// idempotent, so re-pausing while still engaged is a harmless no-op.
	let hovering = false;
	let focusedWithin = false;

	function syncTimer() {
		if (hovering || focusedWithin) {
			pauseToast(item.id);
		} else {
			resumeToast(item.id);
		}
	}

	function handlePointerEnter() {
		hovering = true;
		syncTimer();
	}

	function handlePointerLeave() {
		hovering = false;
		syncTimer();
	}

	function handleFocusIn() {
		focusedWithin = true;
		syncTimer();
	}

	function handleFocusOut() {
		focusedWithin = false;
		syncTimer();
	}

	function handleAction() {
		item.action?.onClick();
	}

	function handleDismiss() {
		dismissToast(item.id);
	}

	const VARIANT_ICON_CLASSES: Record<ToastItem["variant"], string> = {
		success: "ft-toast-icon--success",
		error: "ft-toast-icon--error",
		info: "ft-toast-icon--info",
		loading: "",
	};

	const classes = $derived(
		cn(
			"ft-toast bg-popover text-popover-foreground border-border flex w-[300px] items-center gap-3 rounded-xl border p-3 shadow-[0_12px_32px_rgba(0,0,0,.5)]",
			item.variant === "error" && "border-destructive/30",
			className
		)
	);
</script>

<div
	bind:this={ref}
	class={classes}
	data-state="open"
	data-variant={item.variant}
	onpointerenter={handlePointerEnter}
	onpointerleave={handlePointerLeave}
	onfocusin={handleFocusIn}
	onfocusout={handleFocusOut}
	in:slide={{
		duration: prefersReducedMotion() ? 0 : DURATIONS.base,
		distance: 8,
		easing: JS_EASINGS.out,
	}}
	out:slide={{
		duration: prefersReducedMotion() ? 0 : DURATIONS.exit,
		distance: 4,
		easing: JS_EASINGS.in,
	}}
>
	<span
		class={cn("ft-toast-icon flex-none text-[14px]", VARIANT_ICON_CLASSES[item.variant])}
		aria-hidden="true"
	>
		{#if item.variant === "loading"}
			<span class="ft-toast-spinner"></span>
		{:else if item.variant === "success"}
			✓
		{:else if item.variant === "error"}
			✕
		{:else}
			ℹ
		{/if}
	</span>

	<div class="flex flex-1 flex-col gap-0.5">
		<span class="text-[13px] font-medium">{item.title}</span>
		{#if item.description}
			<span class="text-muted-foreground text-[11px]">{item.description}</span>
		{/if}
	</div>

	{#if item.action}
		<button
			type="button"
			class="ft-toast-action shrink-0 text-[12px] font-medium hover:underline"
			onclick={handleAction}
		>
			{item.action.label}
		</button>
	{/if}

	<button
		type="button"
		class="text-muted-foreground hover:text-foreground shrink-0 text-[12px] transition-colors"
		aria-label="Dismiss"
		onclick={handleDismiss}
	>
		✕
	</button>
</div>

<style>
	/*
	 * Declared locally, once, from the shared consumer-facing `--ft-accent` —
	 * the same indirection `Button` (`--ft-btn-accent`) and `Popover`
	 * (`--ft-overlay-accent` itself) use, and for the same reason: the brand
	 * accent has no semantic Tailwind token, so retinting it has to go
	 * through a real custom property a consumer can set, not a value baked
	 * into each rule below. Every other rule in this file just reads
	 * `var(--ft-overlay-accent)` with no fallback of its own — the fallback
	 * lives here, exactly once, so retinting only ever means overriding
	 * `--ft-accent` and never chasing three separate literals.
	 */
	.ft-toast {
		--ft-overlay-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	.ft-toast-icon--success {
		color: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.7729 0.1535 163.22)));
	}

	.ft-toast-icon--error {
		color: var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)));
	}

	.ft-toast-icon--info {
		color: var(--ft-overlay-accent);
	}

	.ft-toast-action {
		color: var(--ft-overlay-accent);
	}

	.ft-toast-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid color-mix(in oklab, currentColor 20%, transparent);
		border-top-color: var(--ft-overlay-accent);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-toast-spinner {
			animation: ft-toast-spin 0.8s linear infinite;
		}
	}

	@keyframes ft-toast-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
