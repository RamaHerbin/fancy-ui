<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getEditorState } from '../stores/editor.svelte.js';
	import { ArrowUp, ArrowDown, X } from '@lucide/svelte';

	interface Props {
		blockId: string;
		children: Snippet;
	}

	let { blockId, children }: Props = $props();

	const editor = getEditorState();
	let isSelected = $derived(editor.selectedBlockId === blockId);
	let isHovered = $state(false);

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		editor.selectBlock(blockId);
	}

	function handleMoveUp(e: MouseEvent) {
		e.stopPropagation();
		editor.moveBlockUp(blockId);
	}

	function handleMoveDown(e: MouseEvent) {
		e.stopPropagation();
		editor.moveBlockDown(blockId);
	}

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		editor.removeBlock(blockId);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative transition-all {isSelected
		? 'ring-2 ring-primary rounded-sm'
		: isHovered
			? 'ring-1 ring-dashed ring-muted-foreground/30 rounded-sm'
			: ''}"
	data-block-id={blockId}
	onclick={handleClick}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	{#if isSelected}
		<div class="absolute -top-7 right-0 z-50 flex gap-0.5 rounded-t-md bg-primary px-1 py-0.5">
			<button
				type="button"
				class="rounded p-0.5 text-primary-foreground hover:bg-primary-foreground/20"
				title="Move up"
				onclick={handleMoveUp}
			>
				<ArrowUp class="h-3.5 w-3.5" />
			</button>
			<button
				type="button"
				class="rounded p-0.5 text-primary-foreground hover:bg-primary-foreground/20"
				title="Move down"
				onclick={handleMoveDown}
			>
				<ArrowDown class="h-3.5 w-3.5" />
			</button>
			<button
				type="button"
				class="rounded p-0.5 text-primary-foreground hover:bg-destructive"
				title="Delete"
				onclick={handleDelete}
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
	{/if}

	{@render children()}
</div>
