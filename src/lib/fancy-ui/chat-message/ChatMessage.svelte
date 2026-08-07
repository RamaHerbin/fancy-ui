<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ChatMessage
	 */
	export interface ChatMessageProps {
		/** Who produced this turn. Drives alignment, chrome, and the accessible name. */
		role?: "user" | "assistant" | "system";
		/** The message body. Growing strings animate — see StreamingText's contract. */
		content?: string;
		/** Whether `content` is still arriving. Passed through to the body renderer. */
		streaming?: boolean;
		/** Render the body as markdown instead of a tinted plain-text stream. */
		markdown?: boolean;
		/** When the turn was produced. Rendered relative, with the exact time as its tooltip. */
		timestamp?: Date | number;
		/** Rendered beside the body: an image, initials, an icon. */
		avatar?: Snippet;
		/** Replaces the default body rendering entirely. `content` is then ignored. */
		children?: Snippet;
		/** Action buttons, in a rail that fades in on hover or focus. Put `ChatMessageActions` here. */
		actions?: Snippet;
		/** Rendered under the body — where `ChatMessageBranches` belongs. */
		footer?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element, bindable. */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import StreamingText from "../streaming-text/StreamingText.svelte";
	import { formatRelativeTime } from "../_internals/relative-time.js";
	import { createNow } from "../_internals/elapsed.svelte.js";
	import { CHAT_MESSAGE_CONTEXT_KEY, type ChatMessageContext } from "./types.js";

	let {
		role = "assistant",
		content = "",
		streaming = false,
		markdown = false,
		timestamp,
		avatar,
		children,
		actions,
		footer,
		class: className,
		ref = $bindable(null),
	}: ChatMessageProps = $props();

	const LABELS = {
		user: "User message",
		assistant: "Assistant message",
		system: "System message",
	} as const;

	// Pointer and focus are tracked separately and OR-ed: a pointer leaving the
	// message while a button inside it still holds focus must not yank the rail
	// out from under the keyboard.
	let pointerInside = $state(false);
	let focusInside = $state(false);

	const context: ChatMessageContext = {
		get role() {
			return role;
		},
		get streaming() {
			return streaming;
		},
		hovered: {
			get current() {
				return pointerInside || focusInside;
			},
		},
	};

	setContext(CHAT_MESSAGE_CONTEXT_KEY, context);

	const isUser = $derived(role === "user");
	const isSystem = $derived(role === "system");

	const time = $derived(
		timestamp === undefined
			? undefined
			: timestamp instanceof Date
				? timestamp.getTime()
				: timestamp
	);
	const isValidTime = $derived(time !== undefined && Number.isFinite(time));

	// A message left mounted through a long-lived session must not freeze at
	// whatever age it had on first paint. `now` only ticks while a timestamp is
	// actually shown; the effect's cleanup (the `stop` that `start()` returns)
	// silences it once the message unmounts or the timestamp is cleared.
	const now = createNow();
	$effect(() => (isValidTime ? now.start() : undefined));

	const relative = $derived(
		isValidTime ? formatRelativeTime(time as number, { now: now.value }) : ""
	);
	const iso = $derived(isValidTime ? new Date(time as number).toISOString() : undefined);
</script>

<article
	bind:this={ref}
	class={cn(
		"ft-message flex w-full gap-3",
		isUser && "flex-row-reverse",
		isSystem && "justify-center",
		className
	)}
	data-role={role}
	aria-label={LABELS[role]}
	onpointerenter={() => (pointerInside = true)}
	onpointerleave={() => (pointerInside = false)}
	onfocusin={() => (focusInside = true)}
	onfocusout={() => (focusInside = false)}
>
	{#if isSystem}
		<div
			class="text-muted-foreground flex max-w-prose flex-col items-center gap-1 py-1 text-center"
		>
			<div
				class="text-xs leading-relaxed text-balance"
				aria-live="polite"
				aria-atomic="true"
				aria-busy={streaming}
			>
				{#if children}
					{@render children()}
				{:else}
					<StreamingText text={content} {streaming} {markdown} />
				{/if}
			</div>
			{#if relative}
				<time class="text-[0.6875rem] tabular-nums opacity-80" datetime={iso} title={iso}
					>{relative}</time
				>
			{/if}
			{#if footer}
				{@render footer()}
			{/if}
		</div>
	{:else}
		{#if avatar}
			<div class="ft-message-avatar mt-0.5 shrink-0">{@render avatar()}</div>
		{/if}

		<div
			class={cn("flex min-w-0 flex-col gap-1.5", isUser ? "items-end" : "w-full")}
			class:ft-message-capped={isUser}
		>
			<div
				class={cn("text-sm leading-relaxed", isUser && "rounded-2xl px-4 py-2.5")}
				class:ft-message-bubble={isUser}
				aria-live="polite"
				aria-atomic="true"
				aria-busy={streaming}
			>
				{#if children}
					{@render children()}
				{:else}
					<StreamingText text={content} {streaming} {markdown} />
				{/if}
			</div>

			{#if relative || actions}
				<div class={cn("flex items-center gap-2", isUser && "flex-row-reverse")}>
					{#if relative}
						<time class="text-muted-foreground text-xs tabular-nums" datetime={iso} title={iso}
							>{relative}</time
						>
					{/if}
					{#if actions}
						{@render actions()}
					{/if}
				</div>
			{/if}

			{#if footer}
				{@render footer()}
			{/if}
		</div>
	{/if}
</article>

<style>
	/*
	 * A user turn is a bubble; an assistant turn is plain flow, the way a written
	 * answer reads. Only the bubble is capped, so a long answer uses the column it
	 * was given instead of being squeezed into a column-and-a-bit.
	 */
	.ft-message-capped {
		max-inline-size: var(--ft-message-max-width, 85%);
	}

	.ft-message-bubble {
		background: var(--ft-message-user-bg, color-mix(in oklab, currentColor 8%, transparent));
		color: var(--ft-message-user-fg, inherit);
	}
</style>
