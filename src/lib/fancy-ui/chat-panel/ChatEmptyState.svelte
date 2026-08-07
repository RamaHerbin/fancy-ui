<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ChatEmptyState
	 */
	export interface ChatEmptyStateProps {
		/** The greeting, read as the heading of the empty conversation. */
		title?: string;
		/** A line under the greeting saying what this assistant is for. */
		description?: string;
		/** Decorative mark above the greeting, replacing the default sparkle. */
		icon?: Snippet;
		/** Rendered under the description — where `PromptSuggestions` belongs. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		title = "How can I help?",
		description,
		icon,
		children,
		class: className,
		ref = $bindable(null),
	}: ChatEmptyStateProps = $props();
</script>

<div
	bind:this={ref}
	class={cn(
		"ft-empty text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center",
		className
	)}
>
	<!--
		Decorative by definition: the greeting below carries the meaning, so the
		mark is hidden from the accessibility tree whether it is ours or a
		consumer's.
	-->
	<span class="ft-empty-icon" aria-hidden="true">
		{#if icon}
			{@render icon()}
		{:else}
			<svg
				class="size-8 opacity-60"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M11 5 12.6 10.9 18.5 12.5 12.6 14.1 11 20 9.4 14.1 3.5 12.5 9.4 10.9Z" />
				<path d="M18.5 3 19.1 5.4 21.5 6 19.1 6.6 18.5 9 17.9 6.6 15.5 6 17.9 5.4Z" />
			</svg>
		{/if}
	</span>

	<h2 class="ft-empty-title text-foreground text-lg font-semibold text-balance">{title}</h2>

	{#if description}
		<p class="ft-empty-description max-w-prose text-sm leading-relaxed text-balance">
			{description}
		</p>
	{/if}

	{#if children}
		<div class="ft-empty-extra mt-2 flex w-full flex-col items-center">
			{@render children()}
		</div>
	{/if}
</div>
