<script lang="ts">
	import InstallationPage from "$lib/components/docs/InstallationPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { t, docTitle } from "$lib/stores";
</script>

<Seo
	title={docTitle(t("install.metaTitle"))}
	description="Install FancyUI in a Svelte 5 project: add the package, wire up the Tailwind CSS v4 stylesheet, and import your first component."
	path="/docs/getting-started/installation"
/>

<InstallationPage />
