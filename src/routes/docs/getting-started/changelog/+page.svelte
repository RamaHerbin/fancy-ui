<script lang="ts">
	import ChangelogPage from "$lib/components/docs/ChangelogPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { tc } from "$lib/components/docs/chrome-i18n.js";
	import { t, docTitle } from "$lib/stores";

	let { data } = $props();
</script>

<Seo
	title={docTitle(t("changelog.metaTitle"))}
	description={tc("seo.changelog")}
	path="/docs/getting-started/changelog"
/>

<ChangelogPage packages={data.changelogPackages} />
