<script lang="ts" module>
	export interface TimePickerPanelProps {
		/** Additional CSS classes, merged onto the panel. */
		class?: string;
		/** Bindable reference to the panel element. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition, type Side } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { anchored, originFor } from "../_internals/motion/anchored.js";
	import { TIME_PICKER_KEY, type TimePickerContext } from "./types.js";

	let { class: className, ref = $bindable(null) }: TimePickerPanelProps = $props();

	// `TimePicker` only ever mounts this component inside its own `{#if open}`,
	// so the context is always present by the time this runs — there is no
	// standalone-usage fallback to design for, the same as SelectPanel.
	const ctx = getContext<TimePickerContext>(TIME_PICKER_KEY);

	// The side the panel was ACTUALLY placed on, which `anchorPosition` reports
	// through `onPlacement` and which differs from the requested one whenever a
	// flip avoided the viewport edge. Seeded with the requested side rather than
	// left undefined so an un-flipped panel never depends on directive ordering:
	// the growth origin is already right on the first frame, and `onPlacement`
	// only ever has to correct a real flip.
	let resolvedSide = $state<Side>("bottom");

	function rowClasses(index: number): string {
		return cn(
			"ft-time-picker-option flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[6px] font-mono text-foreground select-none",
			(ctx.isSelected(index) || ctx.isActive(index)) && "bg-accent text-accent-foreground"
		);
	}
</script>

<!--
	No focus trap here, unlike PopoverContent — a listbox popup is not a
	dialog. Focus deliberately never leaves the trigger; the active row is
	only ever communicated through `aria-activedescendant` on the button
	above, which is why this panel carries `role="listbox"` and `role="option"`
	rows instead of a plain menu, and why nothing here ever calls `.focus()`.
-->
<div
	bind:this={ref}
	id={ctx.panelId}
	role="listbox"
	class={cn(
		"ft-time-picker-panel border-border bg-popover text-popover-foreground flex max-h-[220px] w-max min-w-[100px] flex-col gap-[1px] overflow-y-auto rounded-[10px] border p-[5px] text-[12px] shadow-lg outline-none",
		className
	)}
	use:portal
	use:anchorPosition={{
		anchor: () => ctx.triggerRef,
		side: "bottom",
		align: "start",
		offset: 4,
		onPlacement: (side) => (resolvedSide = side),
	}}
	use:dismissable={{ onDismiss: ctx.close, exclude: () => [ctx.triggerRef] }}
	in:anchored={{ side: resolvedSide }}
	data-side={resolvedSide}
	data-align="start"
	style:transform-origin={originFor(resolvedSide, "start")}
>
	{#if ctx.slots.length === 0}
		<!-- Reachable when `min`/`max` exclude every generated slot — see the
		     README. A real row, not silently nothing: an empty floating panel
		     with no explanation is a worse failure than this one line. -->
		<p class="text-muted-foreground px-[10px] py-[7px] text-[12px] italic">No times available.</p>
	{:else}
		{#each ctx.slots as slot, index (slot)}
			<!--
				svelte-ignore a11y_click_events_have_key_events -- keyboard activation
				for this row is not local: the trigger button owns every keydown
				(Enter/Space/Arrow keys/Home/End) and drives selection through
				`aria-activedescendant`, per the ARIA combobox-with-listbox-popup
				pattern. A row-level keydown handler would be dead code — focus
				never reaches a row to fire one — not a missing affordance.
			-->
			<div
				id={ctx.optionId(index)}
				role="option"
				tabindex="-1"
				aria-selected={ctx.isSelected(index)}
				class={rowClasses(index)}
				onclick={() => ctx.commit(index)}
				onpointerenter={() => ctx.setActive(index)}
			>
				<span>{ctx.labelFor(slot)}</span>
				{#if ctx.isSelected(index)}
					<span aria-hidden="true" class="text-[var(--ft-field-accent)]">✓</span>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.ft-time-picker-option {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
</style>
