<script lang="ts">
	import { onMount } from 'svelte';
	import { getEditorState } from '../stores/editor.svelte.js';
	import { getBuilderComponent } from '../registry/index.js';
	import { calculateDropPosition, isValidDrop } from '../utils/drag.js';
	import { findNode } from '../utils/tree.js';
	import CanvasBlockRenderer from './CanvasBlockRenderer.svelte';
	import DragOverlay from './DragOverlay.svelte';

	const editor = getEditorState();

	const DEVICE_WIDTHS: Record<string, number> = {
		tablet: 768,
		mobile: 375
	};

	const DEVICE_LABELS: Record<string, string> = {
		tablet: '768 × 1024',
		mobile: '375 × 812'
	};

	let canvasEl: HTMLDivElement;
	let containerWidth = $state(0);

	let viewportWidth = $derived.by(() => {
		return DEVICE_WIDTHS[editor.viewport] ?? 0;
	});

	let zoomLevel = $derived.by(() => {
		if (!viewportWidth || containerWidth <= 0) return 1;
		const padding = 32; // p-4 on each side
		const available = Math.max(containerWidth - padding, 0);
		return Math.min(available / viewportWidth, 1);
	});

	let viewportStyle = $derived.by(() => {
		if (!viewportWidth) {
			return 'contain: layout style';
		}
		return `width: ${viewportWidth}px; zoom: ${zoomLevel}; contain: layout style`;
	});

	let viewportLabel = $derived(DEVICE_LABELS[editor.viewport] ?? null);

	onMount(() => {
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerWidth = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
			}
		});
		observer.observe(canvasEl);
		return () => observer.disconnect();
	});

	function handleCanvasClick() {
		if (editor.mode === 'interact') return;
		editor.deselectBlock();
	}

	function resolveDropTarget(e: PointerEvent) {
		// Find the nearest element with data-drop-id under the pointer
		const els = document.elementsFromPoint(e.clientX, e.clientY);
		for (const el of els) {
			const dropId = (el as HTMLElement).dataset?.dropId;
			if (dropId === undefined) continue;

			// Sentinel: empty string means "append at end of root"
			if (dropId === '') {
				editor.setDropTarget({ blockId: null, position: 'inside' });
				return;
			}

			// Validate drop
			const draggedBlockId =
				editor.dragSource?.type === 'block' ? editor.dragSource.blockId : undefined;
			if (!isValidDrop(draggedBlockId, dropId, editor.page.body)) continue;

			// Calculate position
			const rect = el.getBoundingClientRect();
			const meta = getBuilderComponent(findNode(editor.page.body, dropId)?.type ?? '');
			const isContainer = meta?.acceptsChildren ?? false;
			const position = calculateDropPosition(e.clientY, rect, isContainer);

			editor.setDropTarget({ blockId: dropId, position });
			return;
		}

		// No drop target found — check if hovering over the canvas area
		if (canvasEl && canvasEl.contains(document.elementFromPoint(e.clientX, e.clientY))) {
			editor.setDropTarget({ blockId: null, position: 'inside' });
		} else {
			editor.setDropTarget(null);
		}
	}

	// Global pointermove/pointerup during drag — managed via $effect
	$effect(() => {
		if (!editor.isDragging) return;

		function onMove(e: PointerEvent) {
			editor.updatePointer(e.clientX, e.clientY);
			resolveDropTarget(e);
		}

		function onUp() {
			editor.executeDrop();
			editor.endDrag();
		}

		function onCancel() {
			editor.endDrag();
		}

		function onBlur() {
			editor.endDrag();
		}

		function onVisibilityChange() {
			if (document.visibilityState === 'hidden') {
				editor.endDrag();
			}
		}

		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
		document.addEventListener('pointercancel', onCancel);
		window.addEventListener('blur', onBlur);
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			document.removeEventListener('pointercancel', onCancel);
			window.removeEventListener('blur', onBlur);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative flex-1 overflow-y-auto bg-muted/30 p-4"
	bind:this={canvasEl}
	onclick={handleCanvasClick}
>
	{#if viewportLabel}
		<div class="mb-2 text-center text-xs text-muted-foreground">{viewportLabel}</div>
	{/if}
	<div
		class="min-h-full bg-background shadow-sm transition-all duration-200 {viewportWidth ? 'mx-auto' : ''}"
		style={viewportStyle}
	>
		{#if editor.page.body.length > 0}
			{#each editor.page.body as node (node.id)}
				<CanvasBlockRenderer {node} />
			{/each}

			{#if editor.isDragging}
				<div
					class="flex h-12 items-center justify-center border-2 border-dashed border-primary/30 text-xs text-muted-foreground transition-colors {editor.dropTarget?.blockId === null ? 'border-primary bg-primary/5' : ''}"
					data-drop-id=""
				>
					Drop here to add at end
				</div>
			{/if}
		{:else}
			<div
				class="flex min-h-[400px] items-center justify-center {editor.isDragging
					? 'border-2 border-dashed border-primary/40 bg-primary/5 rounded-lg'
					: ''}"
			>
				<p class="text-muted-foreground">
					{editor.isDragging
						? 'Drop component here'
						: 'Click a component in the palette to add it here'}
				</p>
			</div>
		{/if}
	</div>

	<DragOverlay />
</div>
