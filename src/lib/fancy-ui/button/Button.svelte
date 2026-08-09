<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { ButtonVariant, ButtonSize } from "./types.js";

	export interface ButtonProps {
		/** Visual treatment. */
		variant?: ButtonVariant;
		/** Padding / font-size / radius scale. */
		size?: ButtonSize;
		/** Native `type`. Ignored once `href` is set — an anchor has no `type`. */
		type?: "button" | "submit" | "reset";
		/** Greys the button out and makes it inert to pointer and keyboard activation. */
		disabled?: boolean;
		/**
		 * Swaps `iconStart` for a spinner and marks the control `aria-busy`, without
		 * dimming it the way `disabled` does — the button still reads as "working",
		 * not "unavailable". Activation is blocked exactly like `disabled`.
		 */
		loading?: boolean;
		/** Renders an `<a>` instead of a `<button>` when set. */
		href?: string;
		/** Anchor `target`. `"_blank"` forces a safe `rel` regardless of what `rel` says. */
		target?: string;
		/** Anchor `rel`. Widened, never narrowed — see `target`. */
		rel?: string;
		/** Stretches the button to fill its container's width. */
		fullWidth?: boolean;
		/** Accessible name for a button whose content is icon-only. */
		label?: string;
		/** Fires on activation. Never called while `disabled` or `loading`. */
		onclick?: (event: MouseEvent) => void;
		/** Rendered before the label. Replaced by the spinner while `loading`. */
		iconStart?: Snippet;
		/** Rendered after the label. */
		iconEnd?: Snippet;
		/** The button's label / content. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		variant = "primary",
		size = "md",
		type = "button",
		disabled = false,
		loading = false,
		href = undefined,
		target = undefined,
		rel = undefined,
		fullWidth = false,
		label = undefined,
		onclick,
		iconStart,
		iconEnd,
		children,
		class: className,
		ref = $bindable(null),
	}: ButtonProps = $props();

	const SIZE_CLASSES: Record<ButtonSize, string> = {
		sm: "rounded-[6px] px-[12px] py-[5px] text-[12px]",
		md: "rounded-[8px] px-[18px] py-[9px] text-[13px]",
		lg: "rounded-[10px] px-[24px] py-[12px] text-[14px]",
	};

	const VARIANT_CLASSES: Record<ButtonVariant, string> = {
		primary: "bg-primary text-primary-foreground hover:bg-primary/90",
		secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
		outline: "border border-border text-foreground hover:bg-accent hover:text-accent-foreground",
		ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
		// Colour lives in the scoped style block: the brand purple has no semantic
		// Tailwind token, so it is a family-level CSS custom property instead.
		accent: "ft-btn--accent",
		destructive:
			"border border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive/20",
	};

	const classes = $derived(
		cn(
			"ft-btn",
			"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
			"cursor-pointer transition-colors",
			"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ft-btn-accent)]/35",
			// `data-disabled` covers the anchor branch, which has no native `:disabled`
			// pseudo-class to hang the same dimmed treatment off. It tracks `disabled`
			// alone, never `loading` — `aria-disabled` also goes true while loading (see
			// `anchorInert` below), but the mockup's loading swatch is explicitly not
			// dimmed, so the visual hook and the a11y attribute must stay two different
			// things even though they overlap when `disabled` is set.
			"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
			"data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
			SIZE_CLASSES[size],
			VARIANT_CLASSES[variant],
			fullWidth && "w-full",
			className
		)
	);

	// `target="_blank"` without `noopener` lets the opened page reach back into
	// this one via `window.opener`; a caller-supplied `rel` is widened rather
	// than trusted, so the safe tokens are always present even if they forgot.
	const resolvedRel = $derived.by(() => {
		if (target !== "_blank") return rel;
		const tokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
		tokens.add("noopener");
		tokens.add("noreferrer");
		return [...tokens].join(" ");
	});

	// An <a> has no native `disabled` state, and `href`/`target` drive browser
	// behaviour that never reaches `handleClick` at all — middle-click firing
	// `auxclick`, "open link in new tab" from the context menu, a screen reader's
	// own link-activation gesture. `loading` has to block activation exactly like
	// `disabled` does, so on this branch that can only be done by stripping the
	// attributes that make those paths possible, not by adding another JS guard:
	// there is no event to guard on until after the browser has already acted on
	// `href`. Kept as one flag so `href`, `target`, `aria-disabled` and `tabindex`
	// can't drift out of sync with each other.
	const anchorInert = $derived(disabled || loading);

	// The single guard both branches funnel through. A native `disabled` button
	// already refuses real pointer/keyboard input, but a synthetic `.click()` (or
	// an anchor, which has no disabled state at all) walks straight past that —
	// this is what actually keeps the callback from firing.
	function handleClick(event: MouseEvent) {
		if (disabled || loading) {
			event.preventDefault();
			return;
		}
		onclick?.(event);
	}
</script>

{#if href}
	<a
		bind:this={ref}
		class={classes}
		href={anchorInert ? undefined : href}
		target={anchorInert ? undefined : target}
		rel={resolvedRel}
		aria-label={label}
		data-disabled={disabled ? "true" : undefined}
		aria-disabled={anchorInert ? "true" : undefined}
		aria-busy={loading ? "true" : undefined}
		tabindex={anchorInert ? -1 : undefined}
		onclick={handleClick}
	>
		{#if loading}
			<span class="ft-btn-spinner" aria-hidden="true"></span>
		{:else if iconStart}
			{@render iconStart()}
		{/if}
		{@render children?.()}
		{#if iconEnd}
			{@render iconEnd()}
		{/if}
	</a>
{:else}
	<button
		bind:this={ref}
		class={classes}
		{type}
		{disabled}
		aria-label={label}
		aria-busy={loading ? "true" : undefined}
		onclick={handleClick}
	>
		{#if loading}
			<span class="ft-btn-spinner" aria-hidden="true"></span>
		{:else if iconStart}
			{@render iconStart()}
		{/if}
		{@render children?.()}
		{#if iconEnd}
			{@render iconEnd()}
		{/if}
	</button>
{/if}

<style>
	.ft-btn {
		--ft-btn-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	.ft-btn--accent {
		background: var(--ft-btn-accent);
		color: var(--ft-accent-foreground, oklch(1 0 0));
	}

	.ft-btn--accent:hover {
		background: color-mix(in oklab, var(--ft-btn-accent) 90%, transparent);
	}

	/*
	 * `1em` reads the button's own font-size, so the ring scales with the size
	 * variant instead of needing one fixed diameter per size — at `md` (13px
	 * type) that resolves to the mockup's 14px exactly.
	 */
	.ft-btn-spinner {
		flex: none;
		width: calc(1em + 1px);
		height: calc(1em + 1px);
		border-radius: 50%;
		border: 2px solid color-mix(in oklab, currentColor 30%, transparent);
		border-top-color: currentColor;
	}

	/*
	 * Reduced motion leaves the ring exactly where a static ring already reads as
	 * "busy" — `aria-busy` carries the meaning for assistive tech either way, so
	 * there is nothing to swap out here, only the spin itself to drop.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-btn-spinner {
			animation: ft-btn-spin 0.8s linear infinite;
		}
	}

	@keyframes ft-btn-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
