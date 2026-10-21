<script lang="ts">
	import IntroductionPage from "$lib/components/docs/IntroductionPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { SITE_DESCRIPTION } from "$lib/site.js";
	import { t, docTitle } from "$lib/stores";
</script>

<Seo
	title={docTitle(t("intro.metaTitle"))}
	description={SITE_DESCRIPTION}
	path="/docs/getting-started/introduction"
/>
<IntroductionPage />
