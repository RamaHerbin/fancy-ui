<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition, type Side, type Align } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { anchored, markSurfaceState, originFor } from "../_internals/motion/anchored.js";
	import { getMatchRange } from "./match.js";
	import { AUTOCOMPLETE_KEY, type AutocompleteContext } from "./types.js";

	// `Autocomplete` only ever mounts this component inside its own
	// `{#if open}`, and only once there is at least one suggestion to show —
	// so the context is always present, and `suggestions` is never empty,
	// by the time this runs.
	const ctx = getContext<AutocompleteContext>(AUTOCOMPLETE_KEY);

	// The side the panel was ACTUALLY placed on. This panel always asks for
	// `"bottom"`, but an input sitting low in the viewport flips it to
	// `"top"`, and the entrance origin has to follow — see Combobox's
	// identical panel. Seeded with the requested side so the un-flipped case
	// never depends on `onPlacement` having fired first.
	let resolvedSide = $state<Side>("bottom");

	// The cross-axis alignment as ACTUALLY placed, reported by `anchorPosition`
	// alongside the side. It differs from the requested alignment whenever
	// clamping slid the panel along that axis — near a viewport edge the
	// requested corner is no longer the one touching the anchor, and an
	// entrance grown from it would expand from the far corner instead.
	let resolvedAlign = $state<Align>("start");
</script>

<!--
	A `<div role="listbox">`, not a `<ul>` — see Combobox's identical panel
	for why (its rows are real buttons, not a permitted child of `<ul>`).

	No focus trap: focus never leaves the input (`aria-activedescendant`
	tracks the active row instead). Each row is a real button, kept out of
	the tab sequence with `tabindex="-1"`, with `onmousedown` calling
	`preventDefault()` so clicking one never blurs the input a beat before
	its own `onclick` commits the suggestion.

	This panel had no motion at all until recently — it appeared and vanished
	fully formed while every sibling surface rose into place. It now arrives and
	leaves on ONE bidirectional `transition:`, never a split `in:`/`out:` pair:
	a bidirectional directive hands the in-flight counterpart's current position
	to the fresh call, so a list reopened mid-exit continues from where it is
	instead of snapping to invisible first. That matters more here than
	anywhere else in the family, because a suggestion list closes and reopens
	on keystrokes — a query that stops matching closes it, and the next
	character that matches again reverses the exit already in flight.

	`entering: ctx.open` is what tells it which way it is going — Svelte reports
	`direction: "both"` for one bidirectional directive and cannot tell the two
	apart on its own, and the `{#if}` that mounts this component lives one level
	up in `Autocomplete`, so the flag has to arrive through the context.

	`data-state` is a STATIC literal, changed only by `markSurfaceState` from
	the two handlers below. Svelte marks this branch inert before it plays the
	outro and the scheduler skips inert effects, so a reactive `data-state={…}`
	would never reach the DOM on a real close. `inert` itself is never written
	by hand: Svelte sets it on any element carrying a `transition:` for the
	whole exit, which is what stops a row taking a click on its way out.
-->
<div
	id={ctx.panelId}
	role="listbox"
	class="ft-autocomplete-panel border-border bg-popover text-popover-foreground flex max-h-[260px] w-max min-w-[220px] flex-col gap-[1px] overflow-auto rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none"
	use:portal
	use:anchorPosition={{
		anchor: () => ctx.inputRef,
		side: "bottom",
		align: "start",
		offset: 4,
		onPlacement: (side, align) => {
			resolvedSide = side;
			resolvedAlign = align;
		},
	}}
	use:dismissable={{
		onDismiss: ctx.close,
		exclude: () => [ctx.inputRef],
		active: () => ctx.open,
	}}
	transition:anchored={{ side: resolvedSide, entering: ctx.open }}
	data-state="open"
	data-side={resolvedSide}
	data-align="start"
	style:transform-origin={originFor(resolvedSide, resolvedAlign)}
	onintrostart={(e) => markSurfaceState(e, "open")}
	onoutrostart={(e) => markSurfaceState(e, "closing")}
>
	{#each ctx.suggestions as suggestion, index (suggestion)}
		{@const range = getMatchRange(suggestion, ctx.query)}
		<!-- `onmousedown` below defends against a real browser's
		     focus-follows-mousedown default action stealing focus onto this row
		     before its own `onclick` commits — without it, that focus shift
		     blurs the input first, which closes the panel (unmounting this row)
		     before the click already in flight can land. jsdom implements no
		     such default action to suppress, so no test in this repo can watch
		     this guard prevent that outcome — only that the call happens
		     (`Autocomplete.test.ts`'s "the row's mousedown handler calls
		     preventDefault" dispatches a bare `mousedown` and checks
		     `event.defaultPrevented`). Do not delete this as dead code on the
		     strength of a green suite. -->
		<button
			type="button"
			id={ctx.optionId(index)}
			role="option"
			tabindex="-1"
			aria-selected={ctx.isActive(index)}
			class={cn(
				"ft-autocomplete-option flex w-full cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[7px] text-left",
				ctx.isActive(index) && "bg-accent text-accent-foreground"
			)}
			onmousedown={(event) => event.preventDefault()}
			onclick={() => ctx.select(suggestion)}
		>
			<span>
				{#if range}
					{suggestion.slice(0, range.start)}<strong
						>{suggestion.slice(range.start, range.end)}</strong
					>{suggestion.slice(range.end)}
				{:else}
					{suggestion}
				{/if}
			</span>
			{#if ctx.isActive(index)}
				<kbd aria-hidden="true" class="text-muted-foreground font-mono text-[10px]">⏎</kbd>
			{/if}
		</button>
	{/each}
</div>
