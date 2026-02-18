<script lang="ts">
	import { getEditorState } from '../stores/editor.svelte.js';
	import CanvasBlockRenderer from './CanvasBlockRenderer.svelte';

	const editor = getEditorState();

	let viewportClass = $derived.by(() => {
		switch (editor.viewport) {
			case 'tablet':
				return 'max-w-[768px] mx-auto';
			case 'mobile':
				return 'max-w-[375px] mx-auto';
			default:
				return 'max-w-full';
		}
	});

	function handleCanvasClick() {
		editor.deselectBlock();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex-1 overflow-y-auto bg-muted/30 p-4"
	onclick={handleCanvasClick}
>
	<div class="{viewportClass} min-h-full bg-background shadow-sm transition-all duration-200" style="contain: layout style">
		{#if editor.page.body.length > 0}
			{#each editor.page.body as node (node.id)}
				<CanvasBlockRenderer {node} />
			{/each}
		{:else}
			<div class="flex min-h-[400px] items-center justify-center">
				<p class="text-muted-foreground">Click a component in the palette to add it here</p>
			</div>
		{/if}
	</div>
</div>
