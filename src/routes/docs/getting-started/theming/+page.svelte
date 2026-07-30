<script lang="ts">
	import ThemingPage from "$lib/components/docs/ThemingPage.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { t, docTitle } from "$lib/stores";
</script>

<Seo
	title={docTitle(t("theming.metaTitle"))}
	description="Theme FancyUI with CSS custom properties: colors, radius, motion duration and the rainbow palette, in light and dark mode."
	path="/docs/getting-started/theming"
/>

<ThemingPage />
