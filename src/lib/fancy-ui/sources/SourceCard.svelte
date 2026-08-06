<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { SourceData } from "../_internals/ai-types.js";

	/**
	 * Props for SourceCard
	 */
	export interface SourceCardProps {
		/** The document being cited. Only `title` is ever guaranteed to render. */
		source: SourceData;
		/** Replaces the monogram: a favicon you host, a logo, an icon. */
		icon?: Snippet;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { hostOf, monogram } from "../_internals/host.js";

	let { source, icon, class: className }: SourceCardProps = $props();

	// An explicit `domain` always wins — a caller who says "the standards body"
	// means that, not `www.w3.org`.
	const domain = $derived(source.domain || hostOf(source.url));
	// The host names the place, so it is what the circle stands for; a source
	// with no parsable host falls back to its own title.
	const mark = $derived(monogram(domain || source.title));
	// A citation with nowhere to go is still worth showing — it just must not
	// pretend to be a link.
	const href = $derived(typeof source.url === "string" && source.url !== "" ? source.url : "");
</script>

{#snippet body()}
	<span class="ft-source-mark flex-none" aria-hidden="true">
		{#if icon}
			{@render icon()}
		{:else}
			{mark}
		{/if}
	</span>

	<span class="flex min-w-0 flex-col gap-0.5">
		<span class="ft-source-title text-foreground text-xs leading-snug font-medium">
			{source.title}
		</span>
		{#if domain}
			<span class="ft-source-domain text-muted-foreground text-[0.6875rem] leading-none">
				{domain}
			</span>
		{/if}
		{#if source.snippet}
			<span class="ft-source-snippet text-muted-foreground mt-0.5 text-[0.6875rem] leading-snug">
				{source.snippet}
			</span>
		{/if}
	</span>
{/snippet}

{#if href}
	<!--
		`nofollow ugc` because a model chose this link, not the author of the page
		it sits on; `noopener noreferrer` because the tab it opens has no business
		reaching back into the app or announcing where the reader came from.
	-->
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer nofollow ugc"
		class={cn("ft-source-card ft-source-linked", className)}
	>
		{@render body()}
	</a>
{:else}
	<div class={cn("ft-source-card", className)}>
		{@render body()}
	</div>
{/if}

<style>
	.ft-source-card {
		display: flex;
		gap: 0.5rem;
		border-radius: 0.5rem;
		border: 1px solid
			var(
				--ft-sources-card-border,
				var(--color-border, color-mix(in oklab, currentColor 15%, transparent))
			);
		background: var(--ft-sources-card-bg, color-mix(in oklab, currentColor 3%, transparent));
		padding: 0.5rem 0.625rem;
		text-decoration: none;
		color: inherit;
	}

	.ft-source-linked:hover,
	.ft-source-linked:focus-visible {
		background: var(--ft-sources-card-hover-bg, color-mix(in oklab, currentColor 7%, transparent));
	}

	/*
	 * The monogram stands in for a favicon: no request leaves the reader's browser
	 * to the cited site, and there is no broken image to fall back from.
	 */
	.ft-source-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		background: var(--ft-sources-chip-bg, color-mix(in oklab, currentColor 10%, transparent));
		color: var(--ft-sources-chip-fg, inherit);
		font-size: 0.625rem;
		font-weight: 600;
		line-height: 1;
	}

	/*
	 * Two lines for a title, two for the snippet: enough to tell two results
	 * apart, few enough that a row of cards stays a row.
	 */
	.ft-source-title,
	.ft-source-snippet {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}

	/* A host is an identifier, so it is set like one — and never wrapped. */
	.ft-source-domain {
		overflow: hidden;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-source-linked {
			transition: background-color 150ms ease;
		}
	}
</style>
