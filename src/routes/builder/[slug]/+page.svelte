<script lang="ts">
	import { createEditorState } from "$lib/builder/stores/editor.svelte.js";
	import EditorLayout from "$lib/builder/editor/EditorLayout.svelte";

	let { data } = $props();

	const editor = createEditorState(data.page, {
		siteConfig: data.siteConfig,
		allPages: data.allPages,
	});

	// Reload editor when navigating between pages (SvelteKit reuses the component)
	let lastSlug = data.page.meta.slug;
	$effect(() => {
		const slug = data.page.meta.slug;
		if (slug !== lastSlug) {
			lastSlug = slug;
			editor.loadPage(data.page, {
				siteConfig: data.siteConfig,
				allPages: data.allPages,
			});
		}
	});
</script>

<svelte:head>
	<title>Edit: {editor.page.meta.title}</title>
</svelte:head>

<EditorLayout />
