<script lang="ts">
	import { onMount, type Component } from "svelte";
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import ErrorBody from "$lib/components/site/ErrorBody.svelte";

	// The docs layout owns the search dialog (and its global shortcut), so open
	// it the same way a reader would instead of mounting a second one.
	function openSearch() {
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
	}

	// 404 easter egg (a mistyped component slug lands here, not on the root
	// error page): loaded after hydration so the SSR error page stays light.
	let Lost = $state<Component | null>(null);
	onMount(async () => {
		if (page.status !== 404) return;
		try {
			Lost = (await import("$lib/components/eggs/lost/LostInSpace.svelte")).default;
		} catch (error) {
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

<!-- Relative + isolate: the starfield (z -10) stays inside the docs column, behind the copy. -->
<div class="relative isolate">
	<ErrorBody
		status={page.status}
		message={page.error?.message}
		url={page.url.href}
		onsearch={openSearch}
	/>
	{#if Lost}<Lost />{/if}
</div>
