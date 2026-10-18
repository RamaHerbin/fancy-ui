<!--
	"Use in FancyUI" (the reference IS a library component) or "Related
	FancyUI components" (close matches, each with its note). One framework at a
	time, following the site-wide switch: install line, import line, docs and
	source. Only lines that exist for that framework are printed — never a
	Svelte example under React or Vue, never an install command for a package
	that is not on npm.

	The exact panel carries the page's only selected-tier rim light.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { FrameworkSwitch, RimLight } from "$lib/components/site/index.js";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import type { FrameworkVariant } from "$lib/server/variants.js";
	import { FRAMEWORK_LABELS, type ComponentLink, type Framework } from "$lib/inspiration/types.js";
	import CopyLine from "./CopyLine.svelte";

	interface Props {
		mode: "exact" | "related";
		links: ComponentLink[];
		variants: Record<string, FrameworkVariant[]>;
		/** Registry display names by slug. */
		names: Record<string, string>;
		/** One switch per page: off when another panel above already shows it. */
		showSwitch?: boolean;
		class?: string;
	}

	let { mode, links, variants, names, showSwitch = true, class: className = "" }: Props = $props();

	const uid = $props.id();
	const store = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const framework = $derived<Framework>(mounted ? store.framework : "svelte");

	function variantOf(slug: string): FrameworkVariant | undefined {
		return variants[slug]?.find((v) => v.framework === framework);
	}
</script>

<section class="vp {className}" data-mode={mode} aria-labelledby="vp-{uid}">
	<div class="top">
		<h2 id="vp-{uid}">{mode === "exact" ? "Use in FancyUI" : "Related FancyUI components"}</h2>
		{#if showSwitch}<FrameworkSwitch size="sm" />{/if}
	</div>

	<ul class="list">
		{#each links as link (link.slug)}
			{@const variant = variantOf(link.slug)}
			{@const name = names[link.slug] ?? link.slug}
			<li class="item" data-framework={framework}>
				<p class="name">
					<a href="/docs/components/{link.slug}">{name}</a>
					{#if variant && variant.availability !== "available"}
						<span class="status fx-mono"
							>{variant.availability === "source-only" ? "Source only" : "No port"}</span
						>
					{/if}
				</p>
				{#if link.note}<p class="note">{link.note}</p>{/if}

				{#if variant}
					{#if variant.installLine}
						<CopyLine
							text={variant.installLine}
							prefix="$"
							label="install command for {name} ({FRAMEWORK_LABELS[framework]})"
						/>
					{/if}
					{#if variant.importLine}
						<CopyLine
							text={variant.importLine}
							label="import line for {name} ({FRAMEWORK_LABELS[framework]})"
						/>
					{/if}
					{#if variant.note}<p class="vnote">{variant.note}</p>{/if}
					{#if variant.availability !== "unavailable"}
						<p class="links">
							<a href={variant.docsUrl}>Docs</a>
							<a href={variant.sourceUrl} target="_blank" rel="noopener noreferrer"
								>Source <span aria-hidden="true">↗</span></a
							>
						</p>
					{/if}
				{/if}
			</li>
		{/each}
	</ul>

	{#if mode === "exact"}<RimLight tier="selected" seed={5} />{/if}
</section>

<style>
	.vp {
		position: relative;
		padding: 20px;
		border-radius: 16px;
		background: var(--fx-card);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.top {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	h2 {
		font-size: 15px;
		font-weight: 600;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 20px;
		margin-top: 18px;
	}

	.item {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	.item + .item {
		padding-top: 20px;
		box-shadow: inset 0 1px 0 var(--fx-hairline);
	}

	.name {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 14px;
		font-weight: 600;
	}

	.name a:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	.status {
		padding: 2px 6px;
		border-radius: 5px;
		font-size: 9.5px;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.note,
	.vnote {
		font-size: 13px;
		line-height: 1.5;
		color: var(--fx-ink-2);
	}

	.links {
		display: flex;
		gap: 18px;
		font-size: 13px;
	}

	.links a {
		color: var(--fx-ink-2);
		text-decoration: underline;
		text-decoration-color: var(--fx-hairline-strong);
		text-underline-offset: 4px;
	}

	.links a:hover {
		color: var(--fx-ink);
	}

	/* The shared switch is 24 px tall at size sm; touch gets 40. */
	@media (pointer: coarse) {
		.top :global([role="radio"]) {
			min-height: 40px;
		}
		.links a {
			display: inline-flex;
			align-items: center;
			min-height: 40px;
		}
	}
</style>
