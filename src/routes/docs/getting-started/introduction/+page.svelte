<script lang="ts">
	import IntroductionPage from "$lib/components/docs/IntroductionPage.svelte";
	import { t, docTitle } from "$lib/stores";
</script>

<svelte:head>
	<title>{docTitle(t("intro.metaTitle"))}</title>
</svelte:head>

<IntroductionPage />
