<script lang="ts">
	import { createEditorState } from "$lib/builder/stores/editor.svelte.js";
	import EditorLayout from "$lib/builder/editor/EditorLayout.svelte";

	let { data } = $props();

	// The editor store is created once per mount; navigation between pages goes through `loadPage`.
	// svelte-ignore state_referenced_locally
	const editor = createEditorState(data.page, {
		siteConfig: data.siteConfig,
		allPages: data.allPages,
	});

	// Reload editor when navigating between pages (SvelteKit reuses the component)
	// Remember the slug the editor was built for; the effect below reloads on change.
	// svelte-ignore state_referenced_locally
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
