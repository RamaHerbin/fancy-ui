<script lang="ts">
	import InstallationPage from "$lib/components/docs/InstallationPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { t, docTitle } from "$lib/stores";
</script>

<Seo
	title={docTitle(t("install.metaTitle"))}
	description={t("seo.installation")}
	path="/docs/getting-started/installation"
/>

<InstallationPage />
