<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface TabsTriggerProps {
		/** This trigger's value — which `TabsContent` it activates. */
		value: string;
		/** Disables just this trigger. A disabled trigger is skipped by the arrows and Home/End. */
		disabled?: boolean;
		/** The trigger's content, typically the tab's label. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLButtonElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { TABS_KEY, type TabsContext } from "./types.js";

	let {
		value,
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
	}: TabsTriggerProps = $props();

	// Undefined outside a Tabs root: the trigger then has no selection or
	// roving order to take part in, and renders as a plain, always-tabbable,
	// permanently-unselected button rather than throwing — same degradation
	// as ToggleGroupItem/RadioGroupItem.
	const context = getContext<TabsContext | undefined>(TABS_KEY);

	const isDisabled = $derived(disabled);
	const isSelected = $derived(context?.isSelected(value) ?? false);
	const variant = $derived(context?.variant ?? "underline");
	const orientation = $derived(context?.orientation ?? "horizontal");
	// `undefined` outside a Tabs root leaves the native default (a plain
	// button is already in the tab order on its own); inside one, exactly
	// the trigger holding the roving position gets 0 and every other gets -1.
	const tabIndexAttr = $derived(context ? (context.focusedValue === value ? 0 : -1) : undefined);

	// Geometry, not just colour, branches on variant: the mockup gives the
	// segmented pill a tighter box than the underline tab — 6px/12px versus
	// 8px/13px — not merely a different background.
	const classes = $derived(
		cn(
			"ft-tabs-trigger inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap px-[14px] font-medium transition-colors",
			"focus-visible:outline-none",
			"disabled:pointer-events-none disabled:opacity-50",
			variant === "segmented"
				? cn(
						"rounded-md py-[6px] text-[12px]",
						isSelected
							? "bg-accent text-accent-foreground"
							: "text-muted-foreground hover:text-foreground"
					)
				: cn(
						"py-2 text-[13px]",
						isSelected
							? "ft-tabs-trigger-selected text-foreground"
							: "text-muted-foreground hover:text-foreground"
					),
			className
		)
	);

	// Tracks the disabled transition across re-runs so the effects below can
	// tell "just became disabled" apart from "already was" or "just became
	// enabled". A plain variable, not `$state` — only these two effects ever
	// read or write it, and nothing needs to react to it changing.
	let wasDisabled = false;
	// Set by the pre-effect below, consumed by the registration effect below
	// it. Also a plain variable — see the same reasoning.
	let hadFocusBeforeDisabling = false;
	// Bridges `$effect.pre` to the registration `$effect` below. `$effect.pre`
	// runs before Svelte patches the DOM for this flush, so `document
	// .activeElement` here still reflects last render's focus. A regular
	// `$effect` can be too late to observe that: in a real browser, setting
	// the native `disabled` attribute on a focused control forces an
	// immediate blur, as part of applying that same DOM patch, before any
	// regular effect gets to run — jsdom does not reproduce that forced blur
	// (see `_internals/menu.svelte.ts`'s note on the same limitation), but
	// this capture-before/act-after split is correct either way: it does not
	// depend on *when* the blur happens, or whether it happens at all.
	$effect.pre(() => {
		const nowDisabled = isDisabled;
		const justDisabled = nowDisabled && !wasDisabled;
		wasDisabled = nowDisabled;
		hadFocusBeforeDisabling = justDisabled && ref !== null && document.activeElement === ref;
	});

	// Joins the roving-focus order whenever this trigger is enabled, and
	// leaves it in every other case: disabled from the start, or going
	// disabled mid-session. The effect's cleanup — run on unmount, and again
	// before each re-run when `value` or `isDisabled` changes — unregisters
	// the value the previous run added.
	$effect(() => {
		if (!context) return;
		if (isDisabled) {
			// This trigger just became disabled. If it held real DOM focus
			// right before this render's DOM patch landed — captured above,
			// since jsdom leaves focus on a disabled control and a real
			// browser force-blurs it to <body>, and by the time *this*
			// effect runs either has already happened — hand focus to
			// whichever trigger inherits the roving position, guarded so a
			// trigger that never had focus can never steal it from wherever
			// the user actually is. `focusedValue` here reads the roving
			// registry *after* this same effect's own cleanup (from its
			// previous run, a separate pass that already completed) removed
			// this value from it — nothing in this branch writes that
			// registry itself.
			if (hadFocusBeforeDisabling) {
				hadFocusBeforeDisabling = false;
				const next = context.focusedValue;
				if (next !== null) context.focusElement(next);
			}
			return;
		}
		// Captured locally: `value` inside the returned cleanup would
		// otherwise read whatever the prop is *when the effect next
		// re-runs*, not what it was when this run registered.
		const registeredValue = value;
		context.register(registeredValue);
		return () => context.unregister(registeredValue);
	});

	// The native `disabled` attribute below is the real gate, but a
	// synthetic click fired straight at the element — as a test does —
	// walks straight past it, so the handler repeats the guard itself.
	function handleClick() {
		if (isDisabled) return;
		context?.select(value);
		// A native <button> is only guaranteed to take focus on click in
		// some browsers (macOS Safari notably does not, by default), so the
		// roving tab stop is moved here explicitly rather than left to an
		// incidental `onfocus` — the same reasoning as ToggleGroupItem's
		// click handler.
		context?.focus(value);
		ref?.focus();
	}

	// Keeps the roving tabindex following real DOM focus even when focus
	// arrives some other way than this trigger's own click/keydown handlers
	// below — Shift+Tab back out of the panel, for instance.
	function handleFocus() {
		if (isDisabled) return;
		context?.focus(value);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!context || isDisabled) return;
		const horizontal = context.orientation === "horizontal";
		switch (event.key) {
			case "ArrowRight":
				if (!horizontal) return;
				event.preventDefault();
				context.move(value, 1);
				break;
			case "ArrowLeft":
				if (!horizontal) return;
				event.preventDefault();
				context.move(value, -1);
				break;
			case "ArrowDown":
				if (horizontal) return;
				event.preventDefault();
				context.move(value, 1);
				break;
			case "ArrowUp":
				if (horizontal) return;
				event.preventDefault();
				context.move(value, -1);
				break;
			case "Home":
				event.preventDefault();
				context.moveToEdge("first");
				break;
			case "End":
				event.preventDefault();
				context.moveToEdge("last");
				break;
			// Enter/Space need no case here: a native <button> already fires a
			// click for both, and handleClick selects — in both activation
			// modes, since manual activation only withholds selection from
			// the *arrow* keys, not from an explicit activation key.
		}
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="tab"
	data-ft-tabs-trigger=""
	data-value={value}
	data-orientation={orientation}
	id={context?.triggerId(value)}
	class={classes}
	disabled={isDisabled}
	aria-selected={isSelected}
	aria-controls={context?.panelId(value)}
	tabindex={tabIndexAttr}
	onclick={handleClick}
	onfocus={handleFocus}
	onkeydown={handleKeydown}
>
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.ft-tabs-trigger-selected {
		box-shadow: inset 0 -2px 0 var(--ft-nav-accent);
	}

	.ft-tabs-trigger-selected[data-orientation="vertical"] {
		box-shadow: inset 2px 0 0 var(--ft-nav-accent);
	}

	.ft-tabs-trigger:focus-visible {
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
	}

	/*
	 * The underline and the focus ring are both `box-shadow`, so a selected
	 * trigger that is also keyboard-focused needs the two composited into
	 * one declaration rather than letting the plain `:focus-visible` rule
	 * above silently replace the accent bar underneath it.
	 */
	.ft-tabs-trigger-selected:focus-visible {
		box-shadow:
			inset 0 -2px 0 var(--ft-nav-accent),
			0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
	}

	.ft-tabs-trigger-selected[data-orientation="vertical"]:focus-visible {
		box-shadow:
			inset 2px 0 0 var(--ft-nav-accent),
			0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
	}
</style>
