<script lang="ts">
	import "$lib/components/site/site.css";
	import SiteFonts from "$lib/components/site/SiteFonts.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import JsonLd from "$lib/components/JsonLd.svelte";
	import { SectionHeading, SiteFooter, SiteHeader } from "$lib/components/site/index.js";
	import HomeHero from "$lib/components/home/HomeHero.svelte";
	import PreviewCard from "$lib/components/home/PreviewCard.svelte";
	import CollectionTile from "$lib/components/home/CollectionTile.svelte";
	import CompositionFrame from "$lib/components/home/CompositionFrame.svelte";
	import ChatComposition from "$lib/components/home/ChatComposition.svelte";
	import SettingsComposition from "$lib/components/home/SettingsComposition.svelte";
	import ReferenceToCode from "$lib/components/home/ReferenceToCode.svelte";
	import InstallStrip from "$lib/components/home/InstallStrip.svelte";
	import type { Framework, Reference } from "$lib/inspiration/types.js";
	import { createMotionState } from "$lib/stores/motion.svelte.js";
	import {
		DEFAULT_OG_IMAGE,
		LICENSE_URL,
		PACKAGE_NAME,
		REACT_PACKAGE_NAME,
		SCHEMA_APP_ID,
		SCHEMA_WEBSITE_ID,
		SITE_NAME,
		SITE_URL,
		absoluteUrl,
	} from "$lib/site.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let searchOpen = $state(false);
	const motion = createMotionState();

	const description = $derived(
		`UI inspiration and ${data.stats.components} expressive, open-source components for React, Svelte, and Vue — each reference linked to the code that builds it.`
	);

	/** The badges follow the reference's own component: the exact match first. */
	function frameworksOf(entry: Reference): Framework[] {
		const link = entry.components.find((c) => c.relation === "exact") ?? entry.components[0];
		return link ? (data.frameworks[link.slug] ?? []) : [];
	}

	const COMPOSITIONS = {
		chat: [
			{ slug: "chat-panel", name: "ChatPanel" },
			{ slug: "chat-message", name: "ChatMessage" },
			{ slug: "thinking-indicator", name: "ThinkingIndicator" },
			{ slug: "composer", name: "Composer" },
		],
		settings: [
			{ slug: "tabs", name: "Tabs" },
			{ slug: "toggle-group", name: "ToggleGroup" },
			{ slug: "slider", name: "Slider" },
			{ slug: "switch", name: "Switch" },
		],
	};

	/**
	 * Site-level graph, emitted once from the home page. Both nodes carry a
	 * stable `@id` so deeper pages can reference them instead of restating them.
	 */
	const graph = $derived({
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": SCHEMA_WEBSITE_ID,
				name: SITE_NAME,
				url: SITE_URL,
				description,
				inLanguage: "en",
			},
			{
				"@type": "SoftwareApplication",
				"@id": SCHEMA_APP_ID,
				name: SITE_NAME,
				alternateName: [PACKAGE_NAME, REACT_PACKAGE_NAME],
				applicationCategory: "DeveloperApplication",
				operatingSystem: "Web",
				description,
				url: SITE_URL,
				image: absoluteUrl(DEFAULT_OG_IMAGE),
				license: LICENSE_URL,
				isPartOf: { "@id": SCHEMA_WEBSITE_ID },
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
			},
		],
	});
</script>

<Seo
	title="FancyUI — UI inspiration and expressive components for React, Svelte, and Vue"
	{description}
	path="/"
/>
<JsonLd data={graph} />
<SiteFonts />

<!--
	Fixed dark shell: `.fx-root` carries the site tokens, `.dark` keeps the
	library components inside on their dark branch whatever the visitor's
	light/dark preference.
-->
<div class="fx-root dark home">
	<SiteHeader onSearchClick={() => (searchOpen = true)} />

	<main>
		<HomeHero components={data.stats.components} paused={motion.paused} />

		<section aria-labelledby="home-previews" class="previews">
			<SectionHeading
				index="01"
				title="Previews"
				id="home-previews"
				href="/inspiration"
				linkLabel="View all {data.stats.published}"
			/>
			<div class="grid">
				{#each data.featured as entry, i (entry.id)}
					<PreviewCard
						{entry}
						frameworks={frameworksOf(entry)}
						index={i}
						paused={motion.paused}
						eager={i < 3}
						priority={i === 0}
					/>
				{/each}
			</div>
		</section>

		<section aria-labelledby="home-collections" class="block">
			<SectionHeading index="02" title="Collections" id="home-collections" />
			<ul class="collections">
				{#each data.collections as collection (collection.id)}
					<li><CollectionTile {collection} /></li>
				{/each}
			</ul>
		</section>

		<section aria-labelledby="home-compositions" class="block">
			<SectionHeading index="03" title="Compositions" id="home-compositions" />
			<div class="compositions">
				<CompositionFrame
					title="AI chat surface"
					description="A conversation shell with a thinking state and a composer."
					parts={COMPOSITIONS.chat}
					seed={4}
					paused={motion.paused}
				>
					<ChatComposition />
				</CompositionFrame>
				<CompositionFrame
					title="Settings panel"
					description="Tabs, a segmented choice, a slider and switches, all live."
					parts={COMPOSITIONS.settings}
					seed={7}
					paused={motion.paused}
				>
					<SettingsComposition />
				</CompositionFrame>
			</div>
		</section>

		<section aria-labelledby="home-steps" class="block">
			<SectionHeading index="04" title="From reference to code" id="home-steps" />
			<div class="inner"><ReferenceToCode /></div>
		</section>

		<section aria-labelledby="home-install" class="block">
			<SectionHeading index="05" title="Install" id="home-install" />
			<div class="inner"><InstallStrip /></div>
		</section>
	</main>

	<SiteFooter />
</div>

<CommandSearch bind:open={searchOpen} />

<style>
	.home {
		min-height: 100vh;
		overflow-x: clip;
	}

	main {
		max-width: 1440px;
		margin: 0 auto;
		padding: 0 40px 96px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
		margin-top: 8px;
	}

	.block {
		margin-top: 72px;
	}

	.inner {
		margin-top: 20px;
	}

	.collections {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
		margin-top: 20px;
	}

	.compositions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 24px;
		margin-top: 20px;
	}

	@media (max-width: 1099px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.compositions {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 700px) {
		main {
			padding: 0 16px 64px;
		}
		.grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 16px;
		}
		.block {
			margin-top: 56px;
		}
		/* Horizontal snap scroller, bleeding to the screen edges. */
		.collections {
			display: flex;
			gap: 12px;
			margin-inline: -16px;
			padding: 0 16px 4px;
			overflow-x: auto;
			scroll-snap-type: x mandatory;
			scroll-padding-inline: 16px;
			scrollbar-width: none;
		}
		.collections li {
			flex: 0 0 280px;
			scroll-snap-align: start;
		}
	}
</style>
