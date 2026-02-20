<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getEditorState } from '../stores/editor.svelte.js';
	import { DRAG_THRESHOLD } from '../utils/drag.js';
	import { ArrowUp, ArrowDown, X, GripVertical } from '@lucide/svelte';

	interface Props {
		blockId: string;
		children: Snippet;
	}

	let { blockId, children }: Props = $props();

	const editor = getEditorState();
	let isSelected = $derived(editor.selectedBlockId === blockId);
	let isHovered = $state(false);
	let isEditMode = $derived(editor.mode === 'edit');
	let isInlineEditing = $derived(editor.inlineEditBlockId === blockId);

	// Drag state
	let startX = 0;
	let startY = 0;
	let dragging = false;

	// Drop target indicators
	let isBeingDragged = $derived(
		editor.isDragging &&
			editor.dragSource?.type === 'block' &&
			editor.dragSource.blockId === blockId
	);
	let dropPosition = $derived.by(() => {
		if (!editor.dropTarget || editor.dropTarget.blockId !== blockId) return null;
		return editor.dropTarget.position;
	});

	function handleClick(e: MouseEvent) {
		if (dragging || !isEditMode) return;
		e.stopPropagation();
		editor.selectBlock(blockId);
	}

	function handleDblClick(e: MouseEvent) {
		if (!isEditMode) return;
		e.stopPropagation();
		editor.startInlineEdit(blockId);
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

	function onDragHandlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		e.stopPropagation();
		startX = e.clientX;
		startY = e.clientY;
		dragging = false;
		document.addEventListener('pointermove', onPointerMove);
		document.addEventListener('pointerup', onPointerUp);
	}

	function onPointerMove(e: PointerEvent) {
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;

		if (!dragging && Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
			dragging = true;
			editor.startBlockDrag(blockId);
		}

		if (dragging) {
			editor.updatePointer(e.clientX, e.clientY);
		}
	}

	function onPointerUp() {
		document.removeEventListener('pointermove', onPointerMove);
		document.removeEventListener('pointerup', onPointerUp);

		if (dragging) {
			editor.executeDrop();
			editor.endDrag();
		}

		dragging = false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="relative transition-all duration-75 {isEditMode && isSelected
		? 'ring-2 ring-primary rounded-sm'
		: isEditMode && isHovered
			? 'ring-1 ring-dashed ring-muted-foreground/30 rounded-sm'
			: ''} {isBeingDragged ? 'opacity-40' : ''} {dropPosition === 'inside'
		? 'ring-2 ring-primary/50 ring-inset bg-primary/5 rounded-sm'
		: ''}"
	data-drop-id={blockId}
	onclick={handleClick}
	ondblclick={handleDblClick}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	{#if dropPosition === 'before'}
		<div class="pointer-events-none absolute -top-px left-0 right-0 z-40 h-0.5 bg-primary"></div>
	{/if}

	{#if isEditMode && isSelected && !isInlineEditing}
		<div class="absolute -top-7 right-0 z-50 flex gap-0.5 rounded-t-md bg-primary px-1 py-0.5">
			<button
				type="button"
				class="cursor-grab rounded p-0.5 text-primary-foreground hover:bg-primary-foreground/20"
				title="Drag to reorder"
				style="touch-action: none;"
				onpointerdown={onDragHandlePointerDown}
			>
				<GripVertical class="h-3.5 w-3.5" />
			</button>
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

	{#if isEditMode && !isInlineEditing}
		<div class="pointer-events-none [&_[data-drop-id]]:pointer-events-auto">
			{@render children()}
		</div>
	{:else}
		{@render children()}
	{/if}

	{#if dropPosition === 'after'}
		<div class="pointer-events-none absolute -bottom-px left-0 right-0 z-40 h-0.5 bg-primary"></div>
	{/if}
</div>
