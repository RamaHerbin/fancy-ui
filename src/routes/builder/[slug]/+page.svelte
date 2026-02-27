<script lang="ts">
	import { createEditorState } from "$lib/builder/stores/editor.svelte.js";
	import EditorLayout from "$lib/builder/editor/EditorLayout.svelte";

	let { data } = $props();

	const editor = createEditorState(data.page, {
		siteConfig: data.siteConfig,
		allPages: data.allPages,
	});
</script>

<svelte:head>
	<title>Edit: {editor.page.meta.title}</title>
</svelte:head>

<EditorLayout />
