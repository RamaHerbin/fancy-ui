<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface DialogProps {
		/** Whether the dialog is open. Bindable. */
		open?: boolean;
		/** Fires whenever `open` changes, from any trigger — the close button, Escape, an outside click, or the optional `trigger` snippet. */
		onOpenChange?: (open: boolean) => void;
		/** The heading. Omitted entirely (not just visually) when not given, so `aria-labelledby` never points at nothing. */
		title?: string;
		/** The copy under the title. Same omission rule as `title`. */
		description?: string;
		/** Whether Escape and an outside click close the dialog. The close button always works regardless — see the README. */
		dismissible?: boolean;
		/** Element to focus once the dialog opens. Defaults to the first focusable descendant — often the close button; pass a form field here for dialogs built around one. */
		initialFocus?: HTMLElement | null;
		/** The dialog's body. */
		children?: Snippet;
		/** The action row under the body. Free-form — callers build their own buttons. */
		footer?: Snippet;
		/** Optional trigger; renders in place and opens the dialog on activation. */
		trigger?: Snippet;
		/** Additional classes for the panel. */
		class?: string;
		/** Element reference to the panel. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import DialogSurface from "./DialogSurface.svelte";

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		dismissible = true,
		initialFocus = null,
		children,
		footer,
		trigger,
		class: className,
		ref = $bindable(null),
	}: DialogProps = $props();

	// The only place `open` changes on this side of the wire — a plain
	// function, not an `$effect`, so it never fights a caller's own
	// `bind:open` write and never reads/writes `open` in the same pass.
	function setOpen(next: boolean) {
		open = next;
		onOpenChange?.(next);
	}

	// Not bound with `$bindable`: nothing outside this file ever needs to
	// read or set it. It only has to exist by the time `dismissable`'s
	// `exclude` callback runs, and a plain `$state` gives it that. Also
	// doubles as `DialogSurface`'s `fallbackFocus` target below — a real,
	// findable place for focus to land on close if whatever had focus when
	// the dialog opened is no longer in the document by the time it closes.
	let triggerRef: HTMLElement | null = $state(null);

	// The wrapper only listens for the click bubbling up from whatever the
	// caller put inside `trigger` — it adds no interactive semantics of its
	// own, so the trigger's own content (expected to be a real button or
	// similar) is what carries keyboard activation. `exclude` on
	// `DialogSurface` below is what stops this same element from reading as
	// an "outside" pointerdown once the dialog is open, so clicking the
	// trigger again while open cannot immediately dismiss what it just — or
	// is about to — open.
	function openFromTrigger() {
		if (open) return;
		setOpen(true);
	}

	// One seed, two suffixes — the same one-generator-per-instance pattern
	// FormField and RadioGroup use, safe during SSR. Undefined rather than a
	// generated id with nothing pointing at it while the title/description
	// they'd label are not rendered.
	const uid = $props.id();
	const titleId = $derived(title ? `${uid}-title` : undefined);
	const descriptionId = $derived(description ? `${uid}-description` : undefined);
</script>

{#if trigger}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<!--
		This wrapper adds no semantics of its own on purpose — it only listens
		for the click bubbling up from whatever `trigger` renders, which is
		expected to be a real interactive element (a Button, typically)
		carrying its own keyboard activation. `display: contents` keeps it out
		of layout entirely, so it never affects how the trigger's own content
		positions itself.
	-->
	<span bind:this={triggerRef} class="contents" onclick={openFromTrigger}>
		{@render trigger()}
	</span>
{/if}

{#snippet panelContent()}
	<div class="flex items-start justify-between gap-3">
		{#if title}
			<h2 id={titleId} class="text-[15px] font-semibold text-balance">{title}</h2>
		{/if}
		<!--
			Always rendered and always functional, independent of `dismissible`:
			this is an explicit, deliberate activation — like clicking a Cancel
			button — not the accidental miss-click `dismissible` guards against,
			so a dialog that turns off Escape/outside-click to protect
			in-progress work still leaves one unambiguous way out.
		-->
		<button
			type="button"
			class="ft-dialog-close text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-overlay-accent)]/35 focus-visible:outline-none"
			onclick={() => setOpen(false)}
			aria-label="Close"
		>
			<span aria-hidden="true">✕</span>
		</button>
	</div>
	{#if description}
		<p id={descriptionId} class="text-muted-foreground text-[12.5px] leading-relaxed">
			{description}
		</p>
	{/if}
	{@render children?.()}
	{#if footer}
		<div class="flex justify-end gap-2">
			{@render footer()}
		</div>
	{/if}
{/snippet}

<DialogSurface
	{open}
	role="dialog"
	{titleId}
	{descriptionId}
	escape={dismissible}
	outsideClick={dismissible}
	onDismiss={() => setOpen(false)}
	{initialFocus}
	fallbackFocus={() => triggerRef}
	exclude={() => [triggerRef]}
	panelClass={cn(className)}
	bind:ref
	children={panelContent}
/>
