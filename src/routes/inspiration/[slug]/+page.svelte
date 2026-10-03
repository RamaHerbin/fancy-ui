<!--
	/inspiration/[slug] — one reference: the media (live for FancyUI), what it
	is, how to use it in FancyUI in the visitor's framework, the analysis, and
	three related references. The "Use in FancyUI" panel is the page's only
	glowing surface: the eye goes from the media to where the visitor acts.
-->
<script lang="ts">
	import "$lib/components/site/site.css";
	import { onMount } from "svelte";
	import SiteFonts from "$lib/components/site/SiteFonts.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";
	import JsonLd from "$lib/components/JsonLd.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { SiteFooter, SiteHeader } from "$lib/components/site/index.js";
	import CardGrid from "$lib/components/inspiration/CardGrid.svelte";
	import CopyBrief from "$lib/components/inspiration/CopyBrief.svelte";
	import DetailMedia from "$lib/components/inspiration/DetailMedia.svelte";
	import VariantPanel from "$lib/components/inspiration/VariantPanel.svelte";
	import { ORIGIN_LABELS, originBadge } from "$lib/components/inspiration/labels.js";
	import { buildBrief } from "$lib/inspiration/brief.js";
	import { KNOWN_IDS, getPublished } from "$lib/inspiration/catalog.js";
	import {
		CODE_AVAILABILITY_LABELS,
		FRAMEWORK_LABELS,
		INTERACTION_LABELS,
		KIND_LABELS,
		STYLE_LABELS,
		type Reference,
	} from "$lib/inspiration/types.js";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import { createSavedState } from "$lib/stores/saved.svelte.js";
	import { SCHEMA_WEBSITE_ID, SITE_URL } from "$lib/site.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const entry = $derived(data.entry);
	const path = $derived(`/inspiration/${entry.slug}`);

	let mounted = $state(false);
	onMount(() => (mounted = true));

	const saved = createSavedState(KNOWN_IDS);
	const isSaved = (id: string) => mounted && saved.list.includes(id);
	const pressed = $derived(isSaved(entry.id));

	const framework = createFrameworkState();
	const getBrief = () => buildBrief(entry, framework.framework, data.variants);

	const exact = $derived(entry.components.filter((link) => link.relation === "exact"));
	const related = $derived(entry.components.filter((link) => link.relation === "related"));
	const relatedEntries = $derived(
		data.related.map((slug) => getPublished(slug)).filter((e): e is Reference => !!e)
	);

	const external = $derived(entry.origin === "external");
	const byline = $derived([entry.creator, entry.product].filter(Boolean).join(" · "));
	const tags = $derived([...entry.styleTags, ...entry.interactionTags]);

	const metaRows = $derived(
		[
			["Type", KIND_LABELS[entry.kind]],
			["Interaction", entry.interactionTags.map((tag) => INTERACTION_LABELS[tag]).join(", ")],
			["Style", entry.styleTags.map((tag) => STYLE_LABELS[tag]).join(", ")],
			[
				"Framework of source",
				entry.sourceFramework
					? entry.sourceFramework === "other"
						? "Other"
						: FRAMEWORK_LABELS[entry.sourceFramework]
					: "",
			],
			["Code availability", CODE_AVAILABILITY_LABELS[entry.codeAvailability]],
		].filter(([, value]) => value) as [string, string][]
	);

	const description = $derived(
		`${entry.summary} Why it works, when to use it and how to build it${exact.length ? " with FancyUI" : ""}.`
	);

	const jsonLd = $derived({
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebPage",
				"@id": `${SITE_URL}${path}`,
				url: `${SITE_URL}${path}`,
				name: entry.title,
				description: entry.summary,
				isPartOf: { "@id": SCHEMA_WEBSITE_ID },
				breadcrumb: { "@id": `${SITE_URL}${path}#breadcrumb` },
			},
			{
				"@type": "BreadcrumbList",
				"@id": `${SITE_URL}${path}#breadcrumb`,
				itemListElement: [
					{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
					{
						"@type": "ListItem",
						position: 2,
						name: "Inspiration",
						item: `${SITE_URL}/inspiration`,
					},
					{ "@type": "ListItem", position: 3, name: entry.title, item: `${SITE_URL}${path}` },
				],
			},
		],
	});

	let searchOpen = $state(false);
</script>

<Seo title="{entry.title} — Inspiration | FancyUI" {description} {path} type="article" />
<JsonLd data={jsonLd} />
<SiteFonts />

<div class="fx-root dark page">
	<SiteHeader current="inspiration" onSearchClick={() => (searchOpen = true)} />

	<main>
		<nav class="crumbs fx-mono" aria-label="Breadcrumb">
			<a href="/inspiration">Inspiration</a>
			<span aria-hidden="true">/</span>
			<a href="/inspiration?kind={entry.kind}">{KIND_LABELS[entry.kind]}</a>
			<span aria-hidden="true">/</span>
			<span aria-current="page" class="here">{entry.title}</span>
		</nav>

		<div class="layout">
			<div class="media">
				<!-- Keyed: going to a Related reference remounts the media, so no
				     demo, play state or knob values carry over from the last one. -->
				{#key entry.slug}
					<DetailMedia {entry} />
				{/key}
			</div>

			<div class="side">
				<header>
					<h1>{entry.title}</h1>
					<p class="byline">
						{#if byline}<span>{byline}</span>{/if}
						<span class="origin fx-mono" title={ORIGIN_LABELS[entry.origin]}
							>{originBadge(entry)}</span
						>
					</p>
					<p class="summary">{entry.summary}</p>
					{#if tags.length}
						<p class="tags">
							{#each tags as tag (tag)}<span>#{tag}</span>{/each}
						</p>
					{/if}
				</header>

				<div class="actions">
					{#if external}
						<a class="btn primary" href={entry.sourceUrl} target="_blank" rel="noopener noreferrer"
							>Visit source <span aria-hidden="true">↗</span></a
						>
					{:else}
						<a class="btn primary" href={entry.sourceUrl}>Open docs</a>
					{/if}
					<button
						type="button"
						class="btn"
						aria-pressed={pressed}
						onclick={() => saved.toggleSaved(entry.id)}
					>
						<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
							<path
								d="M4 2.5h8v11l-4-2.8-4 2.8z"
								fill={pressed ? "currentColor" : "none"}
								stroke="currentColor"
								stroke-width="1.4"
								stroke-linejoin="round"
							/>
						</svg>
						{pressed ? "Saved" : "Save"}
					</button>
					<CopyBrief {getBrief} class="btn-brief" />
				</div>

				{#if exact.length}
					<VariantPanel mode="exact" links={exact} variants={data.variants} names={data.names} />
				{/if}
				{#if related.length}
					<VariantPanel
						mode="related"
						links={related}
						variants={data.variants}
						names={data.names}
						showSwitch={exact.length === 0}
					/>
				{/if}

				{#if metaRows.length}
					<dl class="facts">
						{#each metaRows as [term, value] (term)}
							<div>
								<dt class="fx-mono">{term}</dt>
								<dd>{value}</dd>
							</div>
						{/each}
					</dl>
				{/if}
			</div>
		</div>

		<section class="analysis" aria-label="Analysis">
			<div>
				<h2>Why it works</h2>
				<p>{entry.analysis.why}</p>
			</div>
			<div>
				<h2>When to use it</h2>
				<p>{entry.analysis.whenToUse}</p>
			</div>
			<div>
				<h2>Things to watch</h2>
				<p>{entry.analysis.watch}</p>
			</div>
		</section>

		{#if entry.analysis.clues.length}
			<section class="clues" aria-labelledby="clues-title">
				<h2 id="clues-title" class="fx-mono">Implementation clues</h2>
				<ul class="fx-mono">
					{#each entry.analysis.clues as clue (clue)}<li>{clue}</li>{/each}
				</ul>
			</section>
		{/if}

		{#if relatedEntries.length}
			<section class="related" aria-labelledby="related-title">
				<h2 id="related-title">Related</h2>
				<CardGrid
					entries={relatedEntries}
					ports={data.frameworks}
					{isSaved}
					onToggleSaved={(e) => saved.toggleSaved(e.id)}
					allowLive={false}
					label="Related references"
				/>
			</section>
		{/if}
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
		align-items: center;
		gap: 10px;
		min-width: 0;
		padding: 24px 0 20px;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
		white-space: nowrap;
	}

	.crumbs a:hover {
		color: var(--fx-ink);
	}

	.here {
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--fx-ink-2);
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 432px;
		gap: 40px;
		align-items: start;
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 24px;
		min-width: 0;
	}

	h1 {
		font-size: 32px;
		line-height: 1.1;
		font-weight: 700;
		letter-spacing: -0.025em;
		text-wrap: balance;
	}

	.byline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
		font-size: 14px;
		color: var(--fx-ink-3);
	}

	.origin {
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 7px;
		border-radius: 6px;
		font-size: 10px;
		letter-spacing: 0.12em;
		color: var(--fx-ink);
		box-shadow: inset 0 0 0 1px rgb(242 241 236 / 0.35);
	}

	.summary {
		margin-top: 14px;
		font-size: 16px;
		line-height: 1.5;
		color: var(--fx-ink-2);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		margin-top: 12px;
		font-size: 13px;
		color: var(--fx-ink-3);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.btn,
	.actions :global(.btn-brief) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 14px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 500;
		color: var(--fx-ink);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
		cursor: pointer;
		transition:
			box-shadow 180ms var(--fx-ease),
			background-color 180ms var(--fx-ease);
	}

	.btn:hover {
		box-shadow: inset 0 0 0 1px rgb(242 241 236 / 0.32);
	}

	.btn.primary {
		color: var(--fx-canvas);
		background: var(--fx-ink);
		box-shadow: none;
	}

	.btn.primary:hover {
		background: #fff;
	}

	.facts {
		display: flex;
		flex-direction: column;
	}

	.facts > div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 10px 0;
		box-shadow: inset 0 -1px 0 var(--fx-hairline);
		font-size: 13.5px;
	}

	dt {
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
		padding-top: 2px;
	}

	dd {
		text-align: right;
		color: var(--fx-ink-2);
	}

	.analysis {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 40px;
		margin-top: 64px;
		padding-top: 32px;
		box-shadow: inset 0 1px 0 var(--fx-hairline);
	}

	.analysis h2 {
		font-size: 15px;
		font-weight: 600;
	}

	.analysis p {
		margin-top: 10px;
		font-size: 16px;
		line-height: 1.6;
		color: var(--fx-ink-2);
	}

	.clues {
		margin-top: 40px;
	}

	.clues h2 {
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	.clues ul {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 12px;
	}

	.clues li {
		padding: 5px 10px;
		border-radius: 7px;
		font-size: 12px;
		color: var(--fx-ink-2);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.related {
		margin-top: 72px;
	}

	.related h2 {
		margin-bottom: 20px;
		font-size: 22px;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	@media (max-width: 1099px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.analysis {
			grid-template-columns: minmax(0, 1fr);
			gap: 28px;
		}
	}

	@media (max-width: 700px) {
		main {
			padding: 0 16px 64px;
		}
		h1 {
			font-size: 28px;
		}
		.analysis {
			margin-top: 48px;
		}
		.analysis p {
			font-size: 15px;
		}
	}
</style>
