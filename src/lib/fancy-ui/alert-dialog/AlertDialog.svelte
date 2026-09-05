<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface AlertDialogProps {
		/** Whether the alert dialog is open. Bindable. */
		open?: boolean;
		/** Fires whenever `open` changes — Confirm, Cancel, or Escape. */
		onOpenChange?: (open: boolean) => void;
		/** The heading. Omitted entirely (not just visually) when not given, so `aria-labelledby` never points at nothing. */
		title?: string;
		/** The warning copy under the title. Same omission rule as `title`. */
		description?: string;
		/** Label of the destructive action. */
		confirmLabel?: string;
		/** Label of the safe action. */
		cancelLabel?: string;
		/** Called when the destructive action is activated, before the surface closes. */
		onConfirm?: () => void;
		/**
		 * Called when the safe action is activated, before the surface closes —
		 * and also when Escape closes the surface, since Escape is treated as
		 * the keyboard equivalent of Cancel here. See the README for why.
		 */
		onCancel?: () => void;
		/** Element to focus once the surface opens. Defaults to the Cancel button — see the README. */
		initialFocus?: HTMLElement | null;
		/** Optional trigger; renders in place and opens the surface on activation. */
		trigger?: Snippet;
		/** Additional classes for the panel. */
		class?: string;
		/** Element reference to the panel. */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the matching open/select/close cue through the sound controller.
		 * Off by default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import Button from "../button/Button.svelte";
	import DialogSurface from "../dialog/DialogSurface.svelte";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		confirmLabel = "Confirm",
		cancelLabel = "Cancel",
		onConfirm,
		onCancel,
		initialFocus = null,
		trigger,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: AlertDialogProps = $props();

	// Same guard, and the same reason, as Dialog's own `setOpen`: a dismiss
	// that changes nothing fires nothing, so a second Escape during the close
	// cannot fire `onOpenChange` — or, through `handleCancel` below,
	// `onCancel` — a second time.
	function setOpen(next: boolean) {
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
	}

	// Also doubles as `DialogSurface`'s `fallbackFocus` target below — see
	// Dialog.svelte's identical field for why.
	let triggerRef: HTMLElement | null = $state(null);

	function openFromTrigger() {
		if (open) return;
		if (sound) soundFx.play("open");
		setOpen(true);
	}

	// Escape's only path to closing this surface. Routing it through the
	// exact same function the Cancel button calls is the point, not an
	// implementation shortcut — see the README's "why is Escape wired to
	// onCancel" note: a user who presses Escape on a destructive prompt
	// meant to back out, the same thing clicking Cancel means, so both fire
	// the same callback.
	function handleCancel() {
		// Restates `setOpen`'s own dedupe locally: this function runs before
		// `setOpen`, so a second Escape/Cancel arriving while `open` is
		// already false (mid-exit) must not play a second `close`.
		if (sound && open) soundFx.play("close");
		onCancel?.();
		setOpen(false);
	}

	function handleConfirm() {
		// Commit-close is silent — `setOpen` below carries no cue of its own —
		// so `select` is the only sound a confirm ever plays.
		if (sound) soundFx.play("select");
		onConfirm?.();
		setOpen(false);
	}

	const uid = $props.id();
	const titleId = $derived(title ? `${uid}-title` : undefined);
	const descriptionId = $derived(description ? `${uid}-description` : undefined);
</script>

{#if trigger}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<!-- See Dialog.svelte's identical wrapper for why this has no ARIA role of its own. -->
	<span bind:this={triggerRef} class="contents" onclick={openFromTrigger}>
		{@render trigger()}
	</span>
{/if}

{#snippet panelContent()}
	<div class="flex items-center gap-2">
		<span class="text-destructive" aria-hidden="true">⚠</span>
		{#if title}
			<h2 id={titleId} class="text-[15px] font-semibold text-balance">{title}</h2>
		{/if}
	</div>
	{#if description}
		<p id={descriptionId} class="text-muted-foreground text-[12.5px] leading-relaxed">
			{description}
		</p>
	{/if}
	<div class="flex justify-end gap-2">
		<!--
			Cancel first in DOM order — on top of matching the mockup's own
			left-to-right layout, this is what makes it the focus trap's default
			focus target (`focus-trap.ts` always focuses the first focusable
			descendant absent an explicit `initialFocus`), with no extra wiring
			needed to satisfy "cancel, not confirm, is focused first" for the
			common case of no override.
		-->
		<Button variant="outline" size="sm" onclick={handleCancel}>{cancelLabel}</Button>
		<Button variant="destructive" size="sm" onclick={handleConfirm}>{confirmLabel}</Button>
	</div>
{/snippet}

<DialogSurface
	{open}
	role="alertdialog"
	{titleId}
	{descriptionId}
	escape={true}
	outsideClick={false}
	onDismiss={handleCancel}
	{initialFocus}
	fallbackFocus={() => triggerRef}
	exclude={() => [triggerRef]}
	panelClass={cn("border-destructive/25", className)}
	bind:ref
	children={panelContent}
/>
