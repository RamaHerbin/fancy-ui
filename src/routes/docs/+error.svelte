<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import ErrorBody from "$lib/components/site/ErrorBody.svelte";

	// The docs layout owns the search dialog (and its global shortcut), so open
	// it the same way a reader would instead of mounting a second one.
	function openSearch() {
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
	}
</script>

<Seo
	title="{page.status} — FancyUI"
	description="This page could not be displayed. Browse the FancyUI components or head back to the home page."
	path={page.url.pathname}
	noindex
/>

<ErrorBody
	status={page.status}
	message={page.error?.message}
	url={page.url.href}
	onsearch={openSearch}
/>
