<script lang="ts">
	import type { PageDocument } from "../types/index.js";
	import { createEditorState } from "../stores/editor.svelte.js";
	import CanvasBlockRenderer from "./CanvasBlockRenderer.svelte";

	interface Props {
		page: PageDocument;
	}

	let { page }: Props = $props();

	// Test rig: the editor state is created once from the initial page.
	// svelte-ignore state_referenced_locally
	createEditorState(page);
</script>

{#each page.body as node (node.id)}
	<CanvasBlockRenderer {node} />
{/each}
