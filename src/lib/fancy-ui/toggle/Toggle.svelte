<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type ToggleSize = "sm" | "md" | "lg";
	export type ToggleVariant = "ghost" | "outline";

	export interface ToggleProps {
		/** Whether the toggle is currently pressed (active) */
		pressed?: boolean;
		/** Called with the new pressed state whenever the toggle is activated */
		onPressedChange?: (pressed: boolean) => void;
		/** Disables the toggle; blocks both the state change and the callback */
		disabled?: boolean;
		/** Visual size of the control */
		size?: ToggleSize;
		/** `"ghost"` has no resting border, `"outline"` keeps one at rest */
		variant?: ToggleVariant;
		/** Accessible name — required when `children` is icon-only */
		label?: string;
		/** Toggle content, typically a single glyph or a short label */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLButtonElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		pressed = $bindable(false),
		onPressedChange,
		disabled = false,
		size = "md",
		variant = "ghost",
		label,
		children,
		class: className,
		ref = $bindable(null),
	}: ToggleProps = $props();

	const SIZE_CLASSES: Record<ToggleSize, string> = {
		sm: "size-[30px] rounded-[6px] text-xs",
		md: "size-[36px] rounded-[8px] text-sm",
		lg: "size-[42px] rounded-[10px] text-base",
	};

	const classes = $derived(
		cn(
			"ft-toggle inline-flex shrink-0 cursor-pointer items-center justify-center font-medium transition-colors",
			"focus-visible:outline-none",
			"disabled:pointer-events-none disabled:opacity-50",
			SIZE_CLASSES[size],
			variant === "outline" && "border border-border",
			pressed
				? "bg-secondary text-secondary-foreground"
				: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
			className
		)
	);

	// The only place `pressed` changes. Doing this in an $effect instead would
	// mean reading and writing the same state in one pass — here it is a plain
	// event handler, so a caller's own `bind:pressed` write is never fought.
	function toggle() {
		if (disabled) return;
		const next = !pressed;
		pressed = next;
		onPressedChange?.(next);
	}
</script>

<button
	bind:this={ref}
	type="button"
	class={classes}
	aria-pressed={pressed}
	aria-label={label}
	{disabled}
	onclick={toggle}
>
	{@render children?.()}
</button>

<style>
	/*
	 * The brand accent has no semantic token in the app's theme layer, so it is
	 * declared locally with a light-dark() fallback — the same shape the AI
	 * family components use for --ft-status-error. A consumer theme can still
	 * override it by setting --ft-accent higher up the tree.
	 */
	.ft-toggle {
		--ft-toggle-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	/* Pressed state gets an inset accent ring on top of the secondary surface,
	   rather than a plain border, so the active look survives on both the
	   ghost and outline variants without fighting their own border. */
	.ft-toggle[aria-pressed="true"] {
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--ft-toggle-accent) 50%, transparent);
	}

	.ft-toggle:focus-visible {
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-toggle-accent) 35%, transparent);
	}

	/* Focus while pressed needs both rings at once — box-shadow only accepts one
	   value, so the combination is spelled out rather than relying on the two
	   single-purpose rules above to stack. */
	.ft-toggle[aria-pressed="true"]:focus-visible {
		box-shadow:
			inset 0 0 0 1px color-mix(in oklab, var(--ft-toggle-accent) 50%, transparent),
			0 0 0 3px color-mix(in oklab, var(--ft-toggle-accent) 35%, transparent);
	}
</style>
