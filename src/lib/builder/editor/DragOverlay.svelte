<!--
  DragOverlay - Floating element that follows the pointer during drag.
  Shows component name/icon. pointer-events: none so it doesn't block hit-testing.
-->
<script lang="ts">
	import { getEditorState } from '../stores/editor.svelte.js';
	import { getBuilderComponent } from '../registry/index.js';
	import { getIcon } from './IconMap.js';

	const editor = getEditorState();

	let dragLabel = $derived.by(() => {
		if (!editor.dragSource) return '';
		if (editor.dragSource.type === 'palette') {
			const meta = getBuilderComponent(editor.dragSource.slug);
			return meta?.name ?? editor.dragSource.slug;
		}
		if (editor.dragSource.type === 'block') {
			const node = editor.selectedBlock?.id === editor.dragSource.blockId
				? editor.selectedBlock
				: undefined;
			if (node) {
				const meta = getBuilderComponent(node.type);
				return meta?.name ?? node.type;
			}
			return 'Block';
		}
		return '';
	});

	let dragIcon = $derived.by(() => {
		if (!editor.dragSource) return null;
		const slug =
			editor.dragSource.type === 'palette'
				? editor.dragSource.slug
				: editor.selectedBlock?.type;
		if (!slug) return null;
		const meta = getBuilderComponent(slug);
		return meta ? getIcon(meta.icon) : null;
	});

	let badgeText = $derived(
		editor.dragSource?.type === 'palette' ? 'Add' : 'Move'
	);
</script>

{#if editor.isDragging}
	<div
		class="pointer-events-none fixed z-[9999] flex items-center gap-2 rounded-md border bg-card/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur-sm"
		style="left: {editor.pointerX + 12}px; top: {editor.pointerY + 12}px;"
	>
		{#if dragIcon}
			{@const Icon = dragIcon}
			<Icon class="h-4 w-4 shrink-0 text-muted-foreground" />
		{/if}
		<span class="whitespace-nowrap">{dragLabel}</span>
		<span class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{badgeText}</span>
	</div>
{/if}
