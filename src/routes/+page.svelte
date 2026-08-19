<script lang="ts">
	import LandingHeader from "$lib/components/landing/LandingHeader.svelte";
	import HeroSection from "$lib/components/landing/HeroSection.svelte";
	import SignatureGrid from "$lib/components/landing/SignatureGrid.svelte";
	import PrimitivesRow from "$lib/components/landing/PrimitivesRow.svelte";
	import FooterCta from "$lib/components/landing/FooterCta.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import JsonLd from "$lib/components/JsonLd.svelte";
	import "$lib/components/landing/landing.css";
	import {
		COMPONENT_COUNT,
		DEFAULT_OG_IMAGE,
		LICENSE_URL,
		PACKAGE_NAME,
		SCHEMA_APP_ID,
		SCHEMA_WEBSITE_ID,
		SITE_DESCRIPTION,
		SITE_NAME,
		SITE_URL,
		absoluteUrl,
	} from "$lib/site.js";

	const description = `${COMPONENT_COUNT} animated, beautiful UI components for Svelte 5. Built with Tailwind CSS v4 and TypeScript.`;

	/**
	 * Site-level graph, emitted once from the home page. Both nodes carry a
	 * stable `@id` so deeper pages can reference them instead of restating them.
	 */
	const graph = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": SCHEMA_WEBSITE_ID,
				name: SITE_NAME,
				url: SITE_URL,
				description: SITE_DESCRIPTION,
				inLanguage: "en",
			},
			{
				"@type": "SoftwareApplication",
				"@id": SCHEMA_APP_ID,
				name: SITE_NAME,
				alternateName: PACKAGE_NAME,
				applicationCategory: "DeveloperApplication",
				operatingSystem: "Web",
				description: SITE_DESCRIPTION,
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
	};
</script>

<Seo title="FancyUI — Animated components for Svelte 5" {description} path="/" />
<JsonLd data={graph} />

<!--
	The whole page above the footer is one bordered frame: nav, hero, signature
	panels and the primitives row are rows of a single measured grid, drawn on
	the fixed near-black "13a" art direction (see landing.css). The synthwave
	footer keeps its own scene below the frame.
-->
<div class="lp-root">
	<div class="p-3.5">
		<div class="lp-line mx-auto flex max-w-[1536px] flex-col border lg:min-h-[calc(100vh-28px)]">
			<LandingHeader />
			<main class="flex min-h-0 flex-1 flex-col">
				<HeroSection />
				<SignatureGrid />
				<PrimitivesRow />
			</main>
		</div>
	</div>
	<FooterCta />
</div>
