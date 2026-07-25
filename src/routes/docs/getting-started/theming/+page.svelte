<script lang="ts">
	import ThemingPage from "$lib/components/docs/ThemingPage.svelte";
	import { t } from "$lib/stores";
</script>

<svelte:head>
	<title>{t("theming.metaTitle")} - FancyUI Docs</title>
</svelte:head>

<ThemingPage />
