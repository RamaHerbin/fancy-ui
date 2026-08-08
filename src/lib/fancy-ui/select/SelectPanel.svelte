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
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { SELECT_KEY, type SelectContext, type SelectOption } from "./types.js";

	let { class: className, ref = $bindable(null) }: SelectPanelProps = $props();

	// `Select` only ever mounts this component inside its own `{#if open}`,
	// so the context is always present by the time this runs — there is no
	// standalone-usage fallback to design for, the same as PopoverContent.
	const ctx = getContext<SelectContext>(SELECT_KEY);

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
	}}
	use:dismissable={{
		onDismiss: ctx.close,
		exclude: () => [ctx.triggerRef],
	}}
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
	@media (prefers-reduced-motion: no-preference) {
		.ft-select-panel {
			animation: ft-select-in 0.12s ease-out;
		}
	}

	@keyframes ft-select-in {
		from {
			opacity: 0;
			transform: scale(0.97);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.ft-select-option {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
</style>
