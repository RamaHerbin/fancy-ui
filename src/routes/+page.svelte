<script lang="ts">
	import LandingHeader from "$lib/components/landing/LandingHeader.svelte";
	import HeroSection from "$lib/components/landing/HeroSection.svelte";
	import FeatureChips from "$lib/components/landing/FeatureChips.svelte";
	import ComponentsShowcase from "$lib/components/landing/ComponentsShowcase.svelte";
	import IconStrip from "$lib/components/landing/IconStrip.svelte";
	import InstallSection from "$lib/components/landing/InstallSection.svelte";
	import ExamplesSection from "$lib/components/landing/ExamplesSection.svelte";
	import ValuesStrip from "$lib/components/landing/ValuesStrip.svelte";
	import FooterCta from "$lib/components/landing/FooterCta.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import JsonLd from "$lib/components/JsonLd.svelte";
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

<div class="min-h-screen bg-[#050508] text-[#f8fafc]">
	<LandingHeader />
	<main>
		<HeroSection />
		<FeatureChips />
		<ComponentsShowcase />
		<IconStrip />
		<InstallSection />
		<ExamplesSection />
		<ValuesStrip />
		<FooterCta />
	</main>
</div>
