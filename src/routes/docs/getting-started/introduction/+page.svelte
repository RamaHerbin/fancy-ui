<script lang="ts">
	import IntroductionPage from "$lib/components/docs/IntroductionPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { SITE_DESCRIPTION } from "$lib/site.js";
</script>

<!-- Search-result headline, English whatever the locale (see componentDocTitle). -->
<Seo
	title="Introduction — FancyUI, animated components for Svelte 5, React and Vue"
	description={SITE_DESCRIPTION}
	path="/docs/getting-started/introduction"
/>

<IntroductionPage />
