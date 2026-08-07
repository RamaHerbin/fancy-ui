<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ChatMessageActions
	 */
	export interface ChatMessageActionsProps {
		/** Keep the rail on screen even when the message is neither hovered nor focused. */
		alwaysVisible?: boolean;
		/** The buttons — `ChatMessageAction` elements. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { CHAT_MESSAGE_CONTEXT_KEY, type ChatMessageContext } from "./types.js";

	let { alwaysVisible = false, children, class: className }: ChatMessageActionsProps = $props();

	// Undefined when the rail is used outside a ChatMessage: it then behaves as a
	// plain always-hidden-until-focused button group rather than throwing.
	const message = getContext<ChatMessageContext | undefined>(CHAT_MESSAGE_CONTEXT_KEY);

	const visible = $derived(alwaysVisible || (message?.hovered.current ?? false));
</script>

<div
	class={cn("ft-message-actions flex items-center gap-0.5", className)}
	class:ft-visible={visible}
	role="group"
	aria-label="Message actions"
>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	/*
	 * Hidden by opacity rather than display: the rail keeps its box, so revealing
	 * it never reflows the message underneath. It stays focusable while invisible,
	 * which is the point of the `:focus-within` rule — a keyboard user tabbing
	 * into it makes it appear.
	 */
	.ft-message-actions {
		opacity: 0;
	}

	.ft-message-actions.ft-visible,
	.ft-message-actions:focus-within {
		opacity: 1;
	}

	/*
	 * There is no hover on a touch screen, so gating on it would hide the actions
	 * for good. Those pointers get a permanently visible rail.
	 */
	@media (hover: none) {
		.ft-message-actions {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-message-actions {
			transition: opacity 150ms ease;
		}
	}
</style>
