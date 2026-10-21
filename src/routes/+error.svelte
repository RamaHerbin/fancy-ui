<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import ErrorBody from "$lib/components/site/ErrorBody.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";

	let searchOpen = $state(false);
</script>

<Seo
	title="{page.status} — FancyUI"
	description="This page could not be displayed. Browse the FancyUI components or head back to the home page."
	path={page.url.pathname}
	noindex
/>

<div class="bg-background text-foreground min-h-screen">
	<ErrorBody
		status={page.status}
		message={page.error?.message}
		url={page.url.href}
		onsearch={() => (searchOpen = true)}
	/>
</div>

<CommandSearch bind:open={searchOpen} />
