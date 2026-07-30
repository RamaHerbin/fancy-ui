<script lang="ts">
	import ChangelogPage from "$lib/components/docs/ChangelogPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { t, docTitle } from "$lib/stores";

	let { data } = $props();
</script>

<Seo
	title={docTitle(t("changelog.metaTitle"))}
	description="Release history for FancyUI — new components, fixes and breaking changes, version by version."
	path="/docs/getting-started/changelog"
/>

<ChangelogPage raw={data.changelogRaw} />
