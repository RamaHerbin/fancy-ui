<script lang="ts">
	import InstallationPage from "$lib/components/docs/InstallationPage.svelte";
	import { t, docTitle } from "$lib/stores";
</script>

<svelte:head>
	<title>{docTitle(t("install.metaTitle"))}</title>
</svelte:head>

<InstallationPage />
