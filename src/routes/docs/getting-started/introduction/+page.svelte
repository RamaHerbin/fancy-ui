<script lang="ts">
	import IntroductionPage from "$lib/components/docs/IntroductionPage.svelte";
	import { t } from "$lib/stores";
</script>

<svelte:head>
	<title>{t("intro.metaTitle")} - FancyUI Docs</title>
</svelte:head>

<IntroductionPage />
