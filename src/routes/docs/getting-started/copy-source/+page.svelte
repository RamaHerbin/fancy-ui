<script lang="ts">
	import CopySourcePage from "$lib/components/docs/CopySourcePage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { COPY_SOURCE_DESCRIPTION } from "$lib/docs/copy-source-guide.js";
	import { t, docTitle } from "$lib/stores";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
</script>

<Seo
	title={docTitle(t("install.copySource"))}
	description={COPY_SOURCE_DESCRIPTION}
	path="/docs/getting-started/copy-source"
/>

<CopySourcePage exclusions={data.exclusions} />
