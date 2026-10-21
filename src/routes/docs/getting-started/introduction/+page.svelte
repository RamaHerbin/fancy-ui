<script lang="ts">
	import IntroductionPage from "$lib/components/docs/IntroductionPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { tc } from "$lib/components/docs/chrome-i18n.js";
	import { t, docTitle } from "$lib/stores";
</script>

<Seo
	title={docTitle(t("intro.metaTitle"))}
	description={tc("seo.introduction")}
	path="/docs/getting-started/introduction"
/>

<IntroductionPage />
