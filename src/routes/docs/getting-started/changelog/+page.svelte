<script lang="ts">
	import ChangelogPage from "$lib/components/docs/ChangelogPage.svelte";
	import { t } from "$lib/stores";

	let { data } = $props();
</script>

<svelte:head>
	<title>{t("changelog.metaTitle")} - FancyUI Docs</title>
</svelte:head>

<ChangelogPage raw={data.changelogRaw} />
