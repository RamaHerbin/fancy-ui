<script lang="ts">
	import ThemingPage from "$lib/components/docs/ThemingPage.svelte";
	import { t, docTitle } from "$lib/stores";
</script>

<svelte:head>
	<title>{docTitle(t("theming.metaTitle"))}</title>
</svelte:head>

<ThemingPage />
