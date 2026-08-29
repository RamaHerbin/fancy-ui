<script lang="ts" module>
	export interface SelectPanelProps {
		/** Additional CSS classes, merged onto the panel. */
		class?: string;
		/** Bindable reference to the panel element. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition, type Side, type Align } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { anchored, originFor } from "../_internals/motion/anchored.js";
	import { SELECT_KEY, type SelectContext, type SelectOption } from "./types.js";

	let { class: className, ref = $bindable(null) }: SelectPanelProps = $props();

	// `Select` only ever mounts this component inside its own `{#if open}`,
	// so the context is always present by the time this runs — there is no
	// standalone-usage fallback to design for, the same as PopoverContent.
	const ctx = getContext<SelectContext>(SELECT_KEY);

	// The side the panel was ACTUALLY placed on, which is the requested one
	// until `computePosition` flips it away from a viewport edge. Seeded with
	// the request rather than a hardcoded `"bottom"` so the common,
	// never-flipped case never depends on `onPlacement` having fired first:
	// the action runs before the transition reads its params, but only a real
	// flip makes that ordering observable, and a wrong seed would be a
	// one-frame origin jump on every open.
	let resolvedSide = $state<Side>(ctx.side);

	// The cross-axis alignment as ACTUALLY placed, reported by `anchorPosition`
	// alongside the side. It differs from the requested alignment whenever
	// clamping slid the panel along that axis — near a viewport edge the
	// requested corner is no longer the one touching the anchor, and an
	// entrance grown from it would expand from the far corner instead.
	let resolvedAlign = $state<Align>(ctx.align);

	function rowClasses(index: number, option: SelectOption): string {
		return cn(
			"ft-select-option flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[7px] text-foreground select-none",
			(ctx.isSelected(index) || ctx.isActive(index)) && "bg-accent text-accent-foreground",
			option.disabled && "cursor-not-allowed opacity-50"
		);
	}

	function handleClick(index: number, option: SelectOption): void {
		if (option.disabled) return;
		ctx.commit(index);
	}

	function handlePointerEnter(index: number, option: SelectOption): void {
		if (option.disabled) return;
		ctx.setActive(index);
	}

	// A real mousedown on ANY element carrying a `tabindex` attribute — even
	// `-1` — moves DOM focus to it as the browser's own default action,
	// independent of whether application JS ever calls `.focus()` on it.
	// Never calling `.focus()` ourselves is not what keeps focus on the
	// trigger; cancelling that default action is. Without this, clicking a
	// row focuses the row first (mousedown), the click then commits and
	// closes the panel, the row is removed from the DOM, and focus falls
	// through to `document.body` — the same "keep focus put" trick
	// `PasswordInput`'s reveal toggle already uses on its own `mousedown`.
	function preventFocusSteal(event: MouseEvent): void {
		event.preventDefault();
	}
</script>

<!--
	No focus trap here, unlike PopoverContent — a combobox listbox is not a
	dialog. Focus deliberately never leaves the trigger; the active row is
	only ever communicated through `aria-activedescendant` on the button
	above, which is why this panel carries `role="listbox"` and `role="option"`
	rows instead of a plain menu. Focus staying there through a mouse click
	specifically depends on `preventFocusSteal` below, not merely on this
	component never calling `.focus()` — see its own comment.

	`in:` and not `transition:`, deliberately: an entrance-only directive
	leaves teardown synchronous, so closing the panel still removes it from
	the DOM in the same tick that `open` flips false. An exit is PR-scoped
	work of its own, not something to smuggle in behind an entrance.

	That entrance used to live in this file's `<style>` as a hand-rolled
	keyframe, on a duration and a scale floor the panel invented for itself.
	It is now the shared `anchored` transition below, which every floating
	surface in the library uses — one rung, one curve, one floor, and a
	growth origin that follows a flipped placement instead of ignoring it.
-->
<div
	bind:this={ref}
	id={ctx.panelId}
	role="listbox"
	class={cn(
		"ft-select-panel border-border bg-popover text-popover-foreground flex w-max min-w-[160px] flex-col gap-[1px] rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none",
		className
	)}
	use:portal
	use:anchorPosition={{
		anchor: () => ctx.triggerRef,
		side: ctx.side,
		align: ctx.align,
		offset: 4,
		onPlacement: (side, align) => {
			resolvedSide = side;
			resolvedAlign = align;
		},
	}}
	use:dismissable={{
		onDismiss: ctx.close,
		exclude: () => [ctx.triggerRef],
	}}
	in:anchored={{ side: resolvedSide }}
	data-side={resolvedSide}
	data-align={ctx.align}
	style:transform-origin={originFor(resolvedSide, resolvedAlign)}
>
	{#each ctx.options as option, index (option.value)}
		<!--
			svelte-ignore a11y_click_events_have_key_events -- keyboard activation
			for this row is not local: the trigger button owns every keydown
			(Enter/Space/Arrow keys/typeahead) and drives selection through
			`aria-activedescendant`, per the ARIA combobox-with-listbox-popup
			pattern. A row-level keydown handler would be dead code — focus
			never reaches a row to fire one — not a missing affordance.
		-->
		<div
			id={ctx.optionId(index)}
			role="option"
			tabindex="-1"
			aria-selected={ctx.isSelected(index)}
			aria-disabled={option.disabled ? "true" : undefined}
			class={rowClasses(index, option)}
			onmousedown={preventFocusSteal}
			onclick={() => handleClick(index, option)}
			onpointerenter={() => handlePointerEnter(index, option)}
		>
			<span class="truncate">{option.label}</span>
			{#if ctx.isSelected(index)}
				<span aria-hidden="true" class="text-[var(--ft-field-accent)]">✓</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.ft-select-option {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
</style>
