<script lang="ts">
	import { onMount, type Component } from "svelte";
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import ErrorBody from "$lib/components/site/ErrorBody.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";

	let searchOpen = $state(false);

	// 404 easter egg: a starfield and a teleport link, loaded after hydration
	// so the server-rendered error page stays as light as before.
	let Lost = $state<Component | null>(null);
	onMount(async () => {
		if (page.status !== 404) return;
		try {
			Lost = (await import("$lib/components/eggs/lost/LostInSpace.svelte")).default;
		} catch (error) {
			// A stale or offline chunk must not turn the error page into another error.
			console.warn("[eggs] lost failed to load", error);
		}
	});
</script>

<Seo
	title="{page.status} — FancyUI"
	description="This page could not be displayed. Browse the FancyUI components or head back to the home page."
	path={page.url.pathname}
	noindex
/>

<!-- `isolate`: the egg's starfield sits at z -10, behind the copy but above this background. -->
<div class="bg-background text-foreground relative isolate min-h-screen">
	<ErrorBody
		status={page.status}
		message={page.error?.message}
		url={page.url.href}
		onsearch={() => (searchOpen = true)}
	/>
	{#if Lost}<Lost />{/if}
</div>

<CommandSearch bind:open={searchOpen} />
