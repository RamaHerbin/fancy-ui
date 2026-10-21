<script lang="ts">
	import ThemingPage from "$lib/components/docs/ThemingPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { t, docTitle } from "$lib/stores";
</script>

<Seo
	title={docTitle(t("theming.metaTitle"))}
	description={t("seo.theming")}
	path="/docs/getting-started/theming"
/>

<ThemingPage />
