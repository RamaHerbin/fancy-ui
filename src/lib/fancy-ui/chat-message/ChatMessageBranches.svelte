<script lang="ts" module>
	/**
	 * Props for ChatMessageBranches
	 */
	export interface ChatMessageBranchesProps {
		/** Which version is on screen, 1-based. */
		index: number;
		/** How many versions exist. */
		count: number;
		/** Asked to show another version, by 1-based index. Required — the navigator holds no state. */
		onNavigate: (index: number) => void;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { CHAT_MESSAGE_CONTEXT_KEY, type ChatMessageContext } from "./types.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let { index, count, onNavigate, class: className }: ChatMessageBranchesProps = $props();

	// Used to decide which edge the navigator hugs, and to read the root's
	// `sound` prop; absent context is fine for both.
	const message = getContext<ChatMessageContext | undefined>(CHAT_MESSAGE_CONTEXT_KEY);

	const atStart = $derived(index <= 1);
	const atEnd = $derived(index >= count);

	const buttonClass =
		"text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

	// One extracted step both arrows call: the edges are already disabled
	// natively, but a synthetic click bypasses that, so `next` is re-checked
	// against the real range before anything plays or fires.
	function navigate(next: number) {
		if (next < 1 || next > count) return;
		if (message?.sound ?? false) soundFx.play("select");
		onNavigate(next);
	}
</script>

<div
	class={cn(
		"text-muted-foreground flex items-center gap-0.5 text-xs",
		message?.role === "user" && "justify-end",
		className
	)}
	role="group"
	aria-label="Response versions"
>
	<button
		type="button"
		class={buttonClass}
		aria-label="Previous version"
		disabled={atStart}
		onclick={() => navigate(index - 1)}
	>
		<svg
			class="size-3.5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m15 18-6-6 6-6" />
		</svg>
	</button>

	<span class="tabular-nums">{index}/{count}</span>

	<button
		type="button"
		class={buttonClass}
		aria-label="Next version"
		disabled={atEnd}
		onclick={() => navigate(index + 1)}
	>
		<svg
			class="size-3.5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m9 6 6 6-6 6" />
		</svg>
	</button>
</div>
