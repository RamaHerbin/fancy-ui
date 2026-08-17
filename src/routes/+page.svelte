<script lang="ts">
	import LandingHeader from "$lib/components/landing/LandingHeader.svelte";
	import HeroSection from "$lib/components/landing/HeroSection.svelte";
	import ShowcasePanel from "$lib/components/landing/ShowcasePanel.svelte";
	import FooterCta from "$lib/components/landing/FooterCta.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import JsonLd from "$lib/components/JsonLd.svelte";
	import "$lib/components/landing/landing.css";
	import {
		FancyProvider,
		auroraSkin,
		brutalSkin,
		glassSkin,
		terminalSkin,
		retroOsSkin,
		type Skin,
	} from "$lib/cameleon";
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
	 * The page wears a skin, and the header lets a visitor change it — that is the
	 * whole argument of the landing page, so it is state here rather than inside
	 * any one section.
	 *
	 * Deliberately NOT persisted, and deliberately not the docs skin store. This
	 * route is prerendered (see +page.ts) and there is no pre-paint skin
	 * bootstrap in app.html the way there is for theme and locale. A remembered
	 * skin would mean the prerendered HTML paints as Aurora and then snaps to
	 * another skin on hydration: a data-skin flip, a few hundred newly-matching
	 * CSS rules, a webfont swap and a layout shift. Starting from Aurora every
	 * time makes the server output and the first client render identical.
	 */
	const SKINS: Skin[] = [auroraSkin, brutalSkin, glassSkin, terminalSkin, retroOsSkin];
	let skin = $state<Skin>(auroraSkin);

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

<!-- `manageColorScheme` scopes a `.dark` class to this subtree for skins that
     declare colorScheme: "dark", without the provider ever touching <html> —
     so the global theme store and the landing page cannot fight. -->
<FancyProvider {skin} manageColorScheme class="min-h-screen">
	<LandingHeader skins={SKINS} bind:skin />
	<main>
		<HeroSection />
		<ShowcasePanel />
		<FooterCta />
	</main>
</FancyProvider>
