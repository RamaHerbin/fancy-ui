<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ComposerSubmit
	 */
	export interface ComposerSubmitProps {
		/** Accessible name while the composer is idle. */
		label?: string;
		/** Accessible name while a response is streaming. */
		stopLabel?: string;
		/** Replaces the built-in icon. Rendered in both the send and the stop state. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

	let {
		label = "Send",
		stopLabel = "Stop",
		children,
		class: className,
	}: ComposerSubmitProps = $props();

	// Undefined when the button is used outside a Composer: it then renders as a
	// permanently disabled button rather than throwing.
	const composer = getContext<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY);

	const streaming = $derived(composer?.streaming ?? false);
	const empty = $derived(
		(composer?.value.current ?? "").trim() === "" &&
			(composer?.attachments.current.length ?? 0) === 0
	);
	// A stop button with nothing to call is a lie, so it goes grey — which is also
	// what happens with no context at all.
	const stoppable = $derived(typeof composer?.stop === "function");
	// Outside a composer both branches land on disabled: there is nothing to stop,
	// and an absent draft is an empty one.
	const isDisabled = $derived((composer?.disabled ?? false) || (streaming ? !stoppable : empty));

	const name = $derived(streaming ? stopLabel : label);
</script>

<button
	type={streaming ? "button" : "submit"}
	class={cn(
		"ft-composer-submit bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
		className
	)}
	disabled={isDisabled}
	aria-label={name}
	title={name}
	onclick={streaming ? () => composer?.stop() : undefined}
>
	{#if children}
		{@render children()}
	{:else if streaming}
		<svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
			<rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
		</svg>
	{:else}
		<svg
			viewBox="0 0 16 16"
			class="size-4"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M14 2 2 6.8l4.6 2.6L9.2 14z" />
			<path d="M14 2 6.6 9.4" />
		</svg>
	{/if}
</button>
