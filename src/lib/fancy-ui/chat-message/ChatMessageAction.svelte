<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ChatMessageAction
	 */
	export interface ChatMessageActionProps {
		/** Accessible name and tooltip. Required — the icon alone names nothing. */
		label: string;
		/** Called on click, before any confirmation label swaps in. */
		onclick?: (event: MouseEvent) => void;
		/** Pressed state for a toggle. Omit entirely for a plain button. */
		active?: boolean;
		/** Swapped in as the label for two seconds after a click, e.g. "Copied". */
		confirmLabel?: string;
		/** The icon. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { CHAT_MESSAGE_CONTEXT_KEY, type ChatMessageContext } from "./types.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		label,
		onclick,
		active,
		confirmLabel,
		children,
		class: className,
	}: ChatMessageActionProps = $props();

	// A loose action button — used outside a `ChatMessage` root — is silent:
	// there is no root `sound` prop to read, so this falls through to `false`.
	const message = getContext<ChatMessageContext | undefined>(CHAT_MESSAGE_CONTEXT_KEY);

	/** How long the confirmation label holds before the button says what it does again. */
	const CONFIRM_MS = 2000;

	let confirmed = $state(false);
	// A plain let: the timer must not wake anything that writes it.
	let timer: ReturnType<typeof setTimeout> | undefined;

	function clearTimer() {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
	}

	// Reads nothing, so it runs once and its teardown is the unmount cleanup.
	$effect(() => clearTimer);

	function handleClick(event: MouseEvent) {
		// Press, never toggle-on/off: `active` is fully controlled by the caller,
		// so the post-click state is unknowable here.
		if (message?.sound ?? false) soundFx.play("press");
		onclick?.(event);
		if (!confirmLabel) return;
		confirmed = true;
		// A second click restarts the window rather than inheriting the old deadline.
		clearTimer();
		timer = setTimeout(() => {
			confirmed = false;
			timer = undefined;
		}, CONFIRM_MS);
	}

	const currentLabel = $derived(confirmed && confirmLabel ? confirmLabel : label);
</script>

<button
	type="button"
	class={cn(
		"text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none",
		active && "bg-muted text-foreground",
		className
	)}
	aria-label={currentLabel}
	title={currentLabel}
	aria-pressed={active}
	onclick={handleClick}
>
	{#if children}
		{@render children()}
	{/if}
</button>
