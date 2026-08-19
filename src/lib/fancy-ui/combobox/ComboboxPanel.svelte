<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { getMatchRange } from "./match.js";
	import { COMBOBOX_KEY, type ComboboxContext } from "./types.js";

	// `Combobox` only ever mounts this component inside its own `{#if open}`,
	// so the context is always present by the time this runs — no
	// standalone-usage fallback to design for, same as `PopoverContent`.
	const ctx = getContext<ComboboxContext>(COMBOBOX_KEY);
</script>

<!--
	A `<div role="listbox">`, not a `<ul>` — its rows are real `<button>`s
	(role="option" overrides the native semantics for assistive tech), and a
	`<button>` is not a permitted child of `<ul>`.

	No focus trap: focus never leaves the input for this pattern
	(`aria-activedescendant` tracks the active row instead), so there is
	nothing to move focus into or return it from. Each row is real button so
	it stays natively keyboard-operable and the a11y linter is right to ask
	for one, but `tabindex="-1"` keeps it out of the tab sequence — the input
	is the only stop — and `onmousedown` calls `preventDefault()` so the
	pointer's own focus-on-mousedown never fires before the row's own
	`onclick` runs, the same guard `ComposerCommandMenu`'s rows use for the
	identical reason: without it, clicking a row would blur the input a beat
	before selecting anything.
-->
<div
	id={ctx.panelId}
	role="listbox"
	class="ft-combobox-panel border-border bg-popover text-popover-foreground flex max-h-[260px] w-max min-w-[220px] flex-col gap-[1px] overflow-auto rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none"
	use:portal
	use:anchorPosition={{ anchor: () => ctx.inputRef, side: "bottom", align: "start", offset: 4 }}
	use:dismissable={{ onDismiss: ctx.close, exclude: () => [ctx.inputRef] }}
>
	{#if ctx.options.length === 0}
		<div
			role="presentation"
			class="ft-combobox-empty text-muted-foreground rounded-[6px] px-[10px] py-[7px]"
		>
			{ctx.emptyMessage}
		</div>
	{:else}
		{#each ctx.options as option, index (option.value)}
			{@const range = getMatchRange(option.label, ctx.query)}
			<!-- `onmousedown` below defends against a real browser's
			     focus-follows-mousedown default action stealing focus onto this
			     row before its own `onclick` commits — without it, that focus
			     shift blurs the input first, which closes the panel (unmounting
			     this row) before the click already in flight can land. jsdom
			     implements no such default action to suppress, so no test in this
			     repo can watch this guard prevent that outcome — only that the
			     call happens (`Combobox.test.ts`'s "the row's mousedown handler
			     calls preventDefault" dispatches a bare `mousedown` and checks
			     `event.defaultPrevented`). Do not delete this as dead code on the
			     strength of a green suite. -->
			<button
				type="button"
				id={ctx.optionId(index)}
				role="option"
				tabindex="-1"
				disabled={option.disabled}
				aria-selected={ctx.isActive(index)}
				aria-disabled={option.disabled ? "true" : undefined}
				class={cn(
					"ft-combobox-option w-full cursor-pointer rounded-[6px] px-[10px] py-[7px] text-left",
					ctx.isActive(index) && !option.disabled && "bg-accent text-accent-foreground",
					option.disabled && "pointer-events-none opacity-50"
				)}
				onmousedown={(event) => event.preventDefault()}
				onclick={() => ctx.selectOption(option)}
			>
				{#if range}
					{option.label.slice(0, range.start)}<strong
						>{option.label.slice(range.start, range.end)}</strong
					>{option.label.slice(range.end)}
				{:else}
					{option.label}
				{/if}
			</button>
		{/each}
	{/if}
</div>
