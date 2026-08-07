<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ComposerAttachments
	 */
	export interface ComposerAttachmentsProps {
		/** Replaces the default chips. The add button and its file input stay. */
		children?: Snippet;
		/** Accessible name and tooltip for the add button. */
		addLabel?: string;
		/** `accept` for the file picker, e.g. `"image/*,.pdf"`. Omitted by default. */
		accept?: string;
		/** Whether one pick may carry several files. */
		multiple?: boolean;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import ComposerAttachment from "./ComposerAttachment.svelte";
	import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

	let {
		children,
		addLabel = "Attach files",
		accept,
		multiple = true,
		class: className,
	}: ComposerAttachmentsProps = $props();

	// Undefined when the row is used outside a Composer: there is then nothing to
	// list and nowhere to send a pick, so it renders nothing rather than throwing.
	const composer = getContext<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY);

	// Only ever reached imperatively, from the add button's click. `$state` because
	// `bind:this` writes it after mount, and nothing else may.
	let inputEl = $state<HTMLInputElement | null>(null);

	const attachments = $derived(composer?.attachments.current ?? []);
	const disabled = $derived(composer?.disabled ?? false);
	// An empty row inside a composer still earns its line — that is where the
	// paperclip lives. An empty row outside one is a button that could not work.
	const empty = $derived(composer === undefined && attachments.length === 0);

	function pick() {
		// The real picker is the hidden input; the button exists to be named,
		// focusable, and styled like the rest of the composer chrome.
		inputEl?.click();
	}

	function handleChange(event: Event & { currentTarget: HTMLInputElement }) {
		const el = event.currentTarget;
		const files = Array.from(el.files ?? []);
		// Cleared before anything else: re-picking the same file fires no second
		// change event while the input still holds the first pick, and a consumer
		// that rejects an upload would be stuck with it.
		el.value = "";
		if (files.length === 0) return;
		composer?.addFiles(files);
	}
</script>

{#if !empty}
	<div class={cn("ft-composer-attachments flex flex-wrap items-center gap-1.5", className)}>
		{#if children}
			{@render children()}
		{:else}
			<!-- The index rides along in the key: two uploads of the same file can
			     arrive carrying the same id, and a duplicate key is a crash. -->
			{#each attachments as attachment, index (`${attachment.id}#${index}`)}
				<div class="ft-composer-attachment-slot flex min-w-0">
					<ComposerAttachment {attachment} />
				</div>
			{/each}
		{/if}

		<button
			type="button"
			class="ft-composer-attach text-foreground/70 hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
			{disabled}
			aria-label={addLabel}
			title={addLabel}
			onclick={pick}
		>
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path
					d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
				/>
			</svg>
		</button>

		<!-- Out of the tab order and out of the accessibility tree: the button above
		     is the control, and two names for one picker is one too many. -->
		<input
			bind:this={inputEl}
			class="ft-composer-file-input"
			type="file"
			{accept}
			{multiple}
			{disabled}
			tabindex="-1"
			aria-hidden="true"
			onchange={handleChange}
		/>
	</div>
{/if}

<style>
	/* Visually hidden rather than `display: none`: a clipped input still opens its
	   picker on every engine, and still belongs to the form it sits in. */
	.ft-composer-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}

	/*
	 * The entrance belongs to the row, not to the chip: a chip appears because
	 * this list grew one. With the rule gone a new chip is simply there, which is
	 * the same information without the travel.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-composer-attachment-slot {
			animation: ft-composer-attachment-enter var(--ft-composer-attachment-enter-duration, 180ms)
				cubic-bezier(0.16, 1, 0.3, 1) both;
		}

		@keyframes ft-composer-attachment-enter {
			from {
				opacity: 0;
				transform: translateY(4px) scale(0.96);
			}
			to {
				opacity: 1;
				transform: none;
			}
		}
	}
</style>
