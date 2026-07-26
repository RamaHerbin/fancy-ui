<script lang="ts">
	import ChangelogPage from "$lib/components/docs/ChangelogPage.svelte";
	import { t, docTitle } from "$lib/stores";

	let { data } = $props();
</script>

<svelte:head>
	<title>{docTitle(t("changelog.metaTitle"))}</title>
</svelte:head>

<ChangelogPage raw={data.changelogRaw} />
