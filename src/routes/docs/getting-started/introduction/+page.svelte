<script lang="ts">
	import IntroductionPage from "$lib/components/docs/IntroductionPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { COMPONENT_COUNT } from "$lib/site.js";
	import { t, docTitle } from "$lib/stores";
</script>

<Seo
	title={docTitle(t("intro.metaTitle"))}
	description="What FancyUI is: {COMPONENT_COUNT} animated, interactive components built natively for Svelte 5 with runes, Tailwind CSS v4 and full TypeScript types."
	path="/docs/getting-started/introduction"
/>

<IntroductionPage />
