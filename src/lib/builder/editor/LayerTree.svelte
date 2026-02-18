<script lang="ts">
	import { getEditorState } from '../stores/editor.svelte.js';
	import LayerTreeNode from './LayerTreeNode.svelte';

	const editor = getEditorState();
</script>

<div class="flex flex-col gap-0.5 px-1 py-1">
	{#if editor.page.body.length > 0}
		{#each editor.page.body as node (node.id)}
			<LayerTreeNode {node} />
		{/each}
	{:else}
		<p class="px-2 py-4 text-center text-xs text-muted-foreground">
			No blocks yet. Add one from the palette above.
		</p>
	{/if}
</div>
