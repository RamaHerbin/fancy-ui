<!--
	/inspiration/saved — the references bookmarked in this browser. The list
	exists only in localStorage, so the prerendered page is an empty shell and
	the grid fills in after mount (`ready`). Not indexed.
-->
<script lang="ts">
	import "$lib/components/site/site.css";
	import { onMount } from "svelte";
	import SiteFonts from "$lib/components/site/SiteFonts.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { SiteFooter, SiteHeader } from "$lib/components/site/index.js";
	import { Button } from "$lib/fancy-ui/button/index.js";
	import CardGrid from "$lib/components/inspiration/CardGrid.svelte";
	import EmptyState from "$lib/components/inspiration/EmptyState.svelte";
	import { KNOWN_IDS, PUBLISHED } from "$lib/inspiration/catalog.js";
	import type { Reference } from "$lib/inspiration/types.js";
	import { createSavedState } from "$lib/stores/saved.svelte.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let ready = $state(false);
	onMount(() => (ready = true));

	const saved = createSavedState(KNOWN_IDS);

	// Saved order (oldest first), published entries only: a bookmarked draft
	// stays in storage but has no page to show.
	const entries = $derived.by(() => {
		if (!ready) return [];
		const byId = new Map(PUBLISHED.map((entry) => [entry.id, entry]));
		return saved.list.map((id) => byId.get(id)).filter((entry): entry is Reference => !!entry);
	});

	let searchOpen = $state(false);
</script>

<Seo
	title="Saved inspiration | FancyUI"
	description="The references you saved in this browser."
	path="/inspiration/saved"
	noindex
/>
<SiteFonts />

<div class="fx-root dark page">
	<SiteHeader current="inspiration" onSearchClick={() => (searchOpen = true)} />

	<main data-ready={ready || undefined}>
		<nav class="crumbs fx-mono" aria-label="Breadcrumb">
			<a href="/inspiration">Inspiration</a>
			<span aria-hidden="true">/</span>
			<span aria-current="page">Saved</span>
		</nav>

		<header class="head">
			<div>
				<h1>Saved</h1>
				<p class="lede">Saved in this browser — no account, nothing leaves your device.</p>
			</div>
			{#if entries.length}
				<div class="tools">
					<p class="fx-mono count">{entries.length} saved</p>
					<button type="button" class="clear" onclick={() => saved.clearSaved()}>Clear all</button>
				</div>
			{/if}
		</header>

		{#if ready && saved.status === "unavailable"}
			<p class="warn" role="status">
				This browser blocks storage, so saved references last only until the tab closes.
			</p>
		{/if}

		<section aria-label="Saved references">
			{#if !ready}
				<div class="placeholder" aria-hidden="true"></div>
			{:else if entries.length === 0}
				<EmptyState
					title="Nothing saved yet"
					body="Press the bookmark on any card in the gallery to keep it here."
				>
					<Button href="/inspiration" variant="outline">Browse inspiration</Button>
				</EmptyState>
			{:else}
				<CardGrid
					{entries}
					ports={data.frameworks}
					isSaved={() => true}
					onToggleSaved={(entry) => saved.toggleSaved(entry.id)}
					label="Saved references"
				/>
			{/if}
		</section>
	</main>

	<SiteFooter />
</div>

<CommandSearch bind:open={searchOpen} />

<style>
	.page {
		min-height: 100vh;
		overflow-x: clip;
	}

	main {
		max-width: 1440px;
		margin: 0 auto;
		padding: 0 40px 96px;
	}

	.crumbs {
		display: flex;
		gap: 10px;
		padding-top: 28px;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	.crumbs a:hover {
		color: var(--fx-ink);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px 24px;
		padding: 16px 0 32px;
	}

	h1 {
		font-size: 44px;
		line-height: 1.05;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.lede {
		margin-top: 10px;
		font-size: 15px;
		line-height: 1.5;
		color: var(--fx-ink-2);
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 18px;
	}

	.count {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	.clear {
		font-size: 13px;
		color: var(--fx-ink-2);
		text-decoration: underline;
		text-decoration-color: var(--fx-hairline-strong);
		text-underline-offset: 4px;
		cursor: pointer;
	}

	.clear:hover {
		color: var(--fx-ink);
	}

	.warn {
		margin-bottom: 24px;
		font-size: 13px;
		color: var(--fx-ink-2);
	}

	.placeholder {
		min-height: 320px;
	}

	@media (max-width: 700px) {
		main {
			padding: 0 16px 64px;
		}
		h1 {
			font-size: 34px;
		}
	}
</style>
