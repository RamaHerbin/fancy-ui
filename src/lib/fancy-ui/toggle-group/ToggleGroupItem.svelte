<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface ToggleGroupItemProps {
		/** This item's value — what gets added to or removed from the group's selection. */
		value: string;
		/** Disables just this item, independent of the group's own `disabled`. */
		disabled?: boolean;
		/** Accessible name, for icon-only content. Falls back to the rendered content. */
		label?: string;
		/** The item's content, typically a glyph or a short label. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLButtonElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { TOGGLE_GROUP_KEY, type ToggleGroupContext } from "./types.js";

	let {
		value,
		disabled = false,
		label,
		children,
		class: className,
		ref = $bindable(null),
	}: ToggleGroupItemProps = $props();

	// Undefined outside a ToggleGroup: the item then has no selection or
	// roving order to take part in, and renders as a plain, always-tabbable,
	// permanently-unselected button rather than throwing.
	const group = getContext<ToggleGroupContext | undefined>(TOGGLE_GROUP_KEY);

	const isDisabled = $derived(disabled || (group?.disabled ?? false));
	const isSelected = $derived(group?.isSelected(value) ?? false);
	const size = $derived(group?.size ?? "md");
	// `undefined` outside a group leaves the native default (a plain button is
	// already in the tab order on its own); inside one, exactly the item
	// holding the roving position gets 0 and every other gets -1.
	const tabIndexAttr = $derived(group ? (group.focusedValue === value ? 0 : -1) : undefined);

	const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
		sm: "h-[26px] min-w-[26px] rounded-[4px] px-2 text-xs",
		md: "h-[30px] min-w-[32px] rounded-[6px] px-2.5 text-sm",
		lg: "h-[34px] min-w-[36px] rounded-[8px] px-3 text-base",
	};

	const classes = $derived(
		cn(
			// No `transition-colors`: the scoped style block below puts a `transition`
			// shorthand on this same element, and Svelte's scoped CSS is unlayered
			// while Tailwind utilities live in `@layer utilities`, so the utility
			// would have been replaced without a trace. The colour channel is
			// re-declared by hand there instead.
			"ft-toggle-group-item inline-flex shrink-0 cursor-pointer items-center justify-center font-medium",
			"focus-visible:outline-none",
			"disabled:pointer-events-none disabled:opacity-50",
			SIZE_CLASSES[size],
			isSelected
				? "bg-secondary text-secondary-foreground"
				: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
			className
		)
	);

	// Joins the roving-focus order whenever this item is enabled, and leaves
	// it in every other case: disabled from the start, or going disabled
	// mid-session. That keeps the group's fallback tabbable position from
	// ever landing on a button that cannot actually take focus. The effect's
	// cleanup — run on unmount, and again before each re-run when `value` or
	// `isDisabled` changes — unregisters the value the previous run added.
	$effect(() => {
		if (!group || isDisabled) return;
		// Captured locally: `value` inside the returned cleanup would otherwise
		// read whatever the prop is *when the effect next re-runs*, not what it
		// was when this run registered — the same reason ComposerCommandMenu
		// captures its textarea into a local before wiring listeners on it.
		const registeredValue = value;
		group.register(registeredValue);
		return () => group.unregister(registeredValue);
	});

	// The native `disabled` attribute below is the real gate, exactly as in
	// Toggle — but a synthetic event fired directly at the element (as a
	// test does, and as some assistive tech does) can still reach these
	// handlers without going through the browser's own pre-click disabled
	// check, so each one repeats the guard rather than trusting the
	// attribute alone.
	function handleClick() {
		if (isDisabled) return;
		group?.toggle(value);
		// Deliberate, not incidental: a plain `<button>` is only guaranteed
		// to take focus on click in some browsers (macOS Safari notably does
		// not, by default). Without this, a mouse click there would select
		// the item but leave the roving tab stop — and DOM focus — wherever
		// it last was, so the very next Tab lands somewhere the reader did
		// not just interact with. `focus()` on an element already focused is
		// a no-op, so this costs nothing on browsers that would have moved
		// focus here anyway.
		group?.focus(value);
		ref?.focus();
	}

	function handleFocus() {
		if (isDisabled) return;
		group?.focus(value);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!group || isDisabled) return;
		switch (event.key) {
			case "ArrowRight":
			case "ArrowDown":
				event.preventDefault();
				group.move(value, 1);
				break;
			case "ArrowLeft":
			case "ArrowUp":
				event.preventDefault();
				group.move(value, -1);
				break;
			case "Home":
				event.preventDefault();
				group.moveToEdge("first");
				break;
			case "End":
				event.preventDefault();
				group.moveToEdge("last");
				break;
		}
	}
</script>

<button
	bind:this={ref}
	type="button"
	data-ft-toggle-item=""
	data-value={value}
	data-size={size}
	class={classes}
	disabled={isDisabled}
	aria-pressed={isSelected}
	aria-label={label}
	tabindex={tabIndexAttr}
	onclick={handleClick}
	onfocus={handleFocus}
	onkeydown={handleKeydown}
>
	{#if children}
		{@render children()}
	{:else}
		{label ?? value}
	{/if}
</button>

<style>
	/*
	 * Same brand-accent shape as Toggle's own `--ft-toggle-accent`: no
	 * semantic token owns this purple, so it is declared locally with a
	 * light-dark() fallback, retintable from higher up the tree via
	 * `--ft-accent`.
	 */
	.ft-toggle-group-item {
		--ft-toggle-group-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		/* One local alias so the token pair is typed once rather than six times.
		   150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout */
		--ft-toggle-group-motion: var(--ft-duration-fast, 150ms)
			var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
		/* Replaces the `transition-colors` utility removed from the class string
		   above. Colour is a state change, not motion, so it stays outside the
		   reduced-motion query. `text-decoration-color`, `fill` and `stroke`
		   never change on this control, so the three that do are the faithful
		   subset of what the utility covered. */
		transition:
			color var(--ft-toggle-group-motion),
			background-color var(--ft-toggle-group-motion),
			border-color var(--ft-toggle-group-motion);
		/* Kills the ~300ms tap delay without blocking scroll — the same rule,
		   for the same reason, as `.ft-pressable`. */
		touch-action: manipulation;
	}

	/* The focus ring stays an untransitioned `box-shadow`: a ring that fades in
	   is a ring a keyboard user has to wait for. */
	.ft-toggle-group-item:focus-visible {
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-toggle-group-accent) 35%, transparent);
	}

	/* Universal fallback — press feedback must survive reduced motion, and a UA
	   that supports neither query still needs some pressed affordance. */
	.ft-toggle-group-item:active:not(:disabled) {
		opacity: var(--ft-toggle-group-press-opacity, 0.85);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-toggle-group-item {
			/* The individual `scale` property, not `transform: scale()`: this
			   scoped rule is unlayered, so a `transform` here would beat any
			   transform utility a consumer passes through the public `class`
			   prop — a `rotate-45` would silently vanish, at rest AND under
			   the press. `scale` composes with the consumer's `transform`
			   instead of replacing it. */
			scale: 1;
			transition:
				color var(--ft-toggle-group-motion),
				background-color var(--ft-toggle-group-motion),
				border-color var(--ft-toggle-group-motion),
				scale var(--ft-toggle-group-motion);
		}

		.ft-toggle-group-item:active:not(:disabled) {
			scale: var(--ft-toggle-group-press-scale, 0.97);
			/* Full motion = scale only; reduced motion = opacity only. Never both. */
			opacity: 1;
		}
	}
</style>
