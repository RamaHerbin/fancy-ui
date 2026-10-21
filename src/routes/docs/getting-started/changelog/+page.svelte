<script lang="ts">
	import ChangelogPage from "$lib/components/docs/ChangelogPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { t, docTitle } from "$lib/stores";

	let { data } = $props();
</script>

<Seo
	title={docTitle(t("changelog.metaTitle"))}
	description={t("seo.changelog")}
	path="/docs/getting-started/changelog"
/>

<ChangelogPage packages={data.changelogPackages} />
