<script lang="ts">
	import { page } from "$app/stores";
	import PageActions from "$lib/components/docs/PageActions.svelte";
	import { sourcePathForRoute } from "$lib/docs/page-sources.js";
	import { t } from "$lib/stores";

	let { children } = $props();

	const PAGE_KEYS = {
		introduction: "page.introduction",
		installation: "page.installation",
		"copy-source": "install.copySource",
		theming: "page.theming",
		"theme-generator": "page.themeGenerator",
		changelog: "page.changelog",
	} as const;

	const slug = $derived($page.url.pathname.split("/").filter(Boolean).at(-1) ?? "");
	const name = $derived(slug in PAGE_KEYS ? t(PAGE_KEYS[slug as keyof typeof PAGE_KEYS]) : slug);
	const sourcePath = $derived(sourcePathForRoute($page.url.pathname));
</script>

<article class="doc-prose max-w-none">
	{@render children()}
	<div class="border-border mt-12 border-t pt-4">
		<PageActions {sourcePath} {name} />
	</div>
</article>

<style>
	.doc-prose :global(h1) {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.2;
		margin-bottom: 0.75rem;
		color: var(--foreground);
		scroll-margin-top: 5rem;
	}

	.doc-prose :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.3;
		margin-top: 2.5rem;
		margin-bottom: 0.75rem;
		color: var(--foreground);
		scroll-margin-top: 5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.doc-prose :global(h3) {
		font-size: 1.125rem;
		font-weight: 600;
		line-height: 1.4;
		margin-top: 2rem;
		margin-bottom: 0.5rem;
		color: var(--foreground);
		scroll-margin-top: 5rem;
	}

	.doc-prose :global(p) {
		margin-bottom: 1rem;
		line-height: 1.7;
		color: var(--muted-foreground);
	}

	.doc-prose :global(strong) {
		color: var(--foreground);
		font-weight: 600;
	}

	.doc-prose :global(a:not(.page-action)) {
		color: var(--foreground);
		text-decoration: underline;
		text-underline-offset: 4px;
		transition: opacity 0.15s;
	}

	.doc-prose :global(a:not(.page-action):hover) {
		opacity: 0.7;
	}

	.doc-prose :global(ul) {
		list-style: disc;
		padding-inline-start: 1.5rem;
		margin-bottom: 1rem;
	}

	.doc-prose :global(ol) {
		list-style: decimal;
		padding-inline-start: 1.5rem;
		margin-bottom: 1rem;
	}

	.doc-prose :global(li) {
		margin-bottom: 0.375rem;
		line-height: 1.6;
		color: var(--muted-foreground);
	}

	.doc-prose :global(li strong) {
		color: var(--foreground);
	}

	.doc-prose :global(code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.85em;
		background: var(--muted);
		color: var(--foreground);
		padding: 0.15em 0.4em;
		border-radius: 0.25rem;
	}

	.doc-prose :global(pre) {
		background: var(--code-bg);
		border: 1px solid var(--code-border);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		overflow-x: auto;
		margin-bottom: 1.25rem;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.doc-prose :global(pre code) {
		background: transparent;
		padding: 0;
		border-radius: 0;
		color: var(--code-fg);
		font-size: inherit;
	}

	.doc-prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1.25rem;
		font-size: 0.875rem;
	}

	.doc-prose :global(th) {
		text-align: start;
		padding: 0.625rem 1rem;
		border-bottom: 1px solid var(--border);
		font-weight: 600;
		color: var(--foreground);
	}

	.doc-prose :global(td) {
		padding: 0.625rem 1rem;
		border-bottom: 1px solid var(--border);
		color: var(--muted-foreground);
	}

	.doc-prose :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 2rem 0;
	}

	.doc-prose :global(blockquote) {
		border-inline-start: 3px solid var(--border);
		padding-inline-start: 1rem;
		color: var(--muted-foreground);
		font-style: italic;
		margin-bottom: 1rem;
	}

	/* Code stays left-to-right even inside RTL (Arabic/Persian) locales. */
	.doc-prose :global(pre),
	.doc-prose :global(code) {
		direction: ltr;
	}
</style>
