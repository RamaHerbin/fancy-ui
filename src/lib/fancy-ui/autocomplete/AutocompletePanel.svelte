<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition, type Side } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { anchored, originFor } from "../_internals/motion/anchored.js";
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
</script>

<!--
	A `<div role="listbox">`, not a `<ul>` — see Combobox's identical panel
	for why (its rows are real buttons, not a permitted child of `<ul>`).

	No focus trap: focus never leaves the input (`aria-activedescendant`
	tracks the active row instead). Each row is a real button, kept out of
	the tab sequence with `tabindex="-1"`, with `onmousedown` calling
	`preventDefault()` so clicking one never blurs the input a beat before
	its own `onclick` commits the suggestion.

	This panel had no entrance at all until now — it appeared fully formed on
	the first frame while every sibling surface rose into place. `in:` and not
	`transition:`, deliberately: an entrance-only directive leaves teardown
	synchronous, so a suggestion list that stops matching still disappears in
	the same tick.
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
		onPlacement: (side) => (resolvedSide = side),
	}}
	use:dismissable={{ onDismiss: ctx.close, exclude: () => [ctx.inputRef] }}
	in:anchored={{ side: resolvedSide }}
	data-side={resolvedSide}
	data-align="start"
	style:transform-origin={originFor(resolvedSide, "start")}
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
