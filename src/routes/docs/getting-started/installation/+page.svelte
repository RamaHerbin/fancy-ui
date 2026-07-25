<script lang="ts">
	import InstallationPage from "$lib/components/docs/InstallationPage.svelte";
	import { t } from "$lib/stores";
</script>

<svelte:head>
	<title>{t("install.metaTitle")} - FancyUI Docs</title>
</svelte:head>

<InstallationPage />
