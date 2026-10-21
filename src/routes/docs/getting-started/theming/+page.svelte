<script lang="ts">
	import ThemingPage from "$lib/components/docs/ThemingPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { tc } from "$lib/components/docs/chrome-i18n.js";
	import { t, docTitle } from "$lib/stores";
</script>

<Seo
	title={docTitle(t("theming.metaTitle"))}
	description={tc("seo.theming")}
	path="/docs/getting-started/theming"
/>

<ThemingPage />
