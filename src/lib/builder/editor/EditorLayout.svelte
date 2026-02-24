<script lang="ts">
	import ComponentPalette from './ComponentPalette.svelte';
	import LayerTree from './LayerTree.svelte';
	import Canvas from './Canvas.svelte';
	import TopBar from './TopBar.svelte';
	import PropertyPanel from './PropertyPanel.svelte';
	import AutoSave from './AutoSave.svelte';
	import DraftRecoveryBanner from './DraftRecoveryBanner.svelte';
	import { getEditorState } from '../stores/editor.svelte.js';

	const editor = getEditorState();

	function handleKeydown(e: KeyboardEvent) {
		// Skip when focused in input, textarea, or contenteditable
		const target = e.target as HTMLElement;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.contentEditable === 'true'
		) {
			return;
		}

		const mod = e.metaKey || e.ctrlKey;

		if (mod) {
			switch (e.key.toLowerCase()) {
				case 'z':
					e.preventDefault();
					if (e.shiftKey) {
						editor.redo();
					} else {
						editor.undo();
					}
					return;
				case 'y':
					if (!e.shiftKey) {
						e.preventDefault();
						editor.redo();
					}
					return;
				case 's':
					e.preventDefault();
					editor.requestSave();
					return;
				case 'c':
					e.preventDefault();
					editor.copyBlock();
					return;
				case 'x':
					e.preventDefault();
					editor.cutBlock();
					return;
				case 'v':
					e.preventDefault();
					editor.pasteBlock();
					return;
				case 'd':
					e.preventDefault();
					editor.duplicateBlock();
					return;
			}
			return;
		}

		// Non-modifier shortcuts (edit mode only)
		if (editor.mode !== 'edit') return;

		switch (e.key) {
			case 'Delete':
			case 'Backspace':
				e.preventDefault();
				if (editor.selectedBlockId) {
					editor.removeBlock(editor.selectedBlockId);
				}
				return;
			case 'ArrowUp':
				e.preventDefault();
				editor.selectPrev();
				return;
			case 'ArrowDown':
				e.preventDefault();
				editor.selectNext();
				return;
			case 'Escape':
				e.preventDefault();
				editor.deselectBlock();
				return;
		}
	}

	// Global body class management during drag
	$effect(() => {
		if (editor.isDragging) {
			document.body.classList.add('cursor-grabbing', '[&_*]:!cursor-grabbing');
			document.body.style.userSelect = 'none';
		}
		return () => {
			document.body.classList.remove('cursor-grabbing', '[&_*]:!cursor-grabbing');
			document.body.style.userSelect = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="grid flex-1 min-h-0 grid-cols-[240px_1fr_320px] grid-rows-[1fr]">
	<!-- Left panel: Palette + Layer Tree -->
	<div class="flex flex-col overflow-hidden border-r border-border bg-background">
		<div class="shrink-0 border-b border-border px-2 py-2">
			<h2 class="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Components
			</h2>
		</div>
		<div class="flex-1 overflow-y-auto px-1 py-1">
			<ComponentPalette />
		</div>

		<div class="h-px bg-border"></div>

		<div class="shrink-0 border-t border-border px-2 py-2">
			<h2 class="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Layers
			</h2>
		</div>
		<div class="flex-1 overflow-y-auto">
			<LayerTree />
		</div>
	</div>

	<!-- Center: TopBar + Canvas -->
	<div class="flex flex-col overflow-hidden">
		<DraftRecoveryBanner />
		<TopBar />
		<Canvas />
	</div>

	<AutoSave />

	<!-- Right panel: Properties -->
	<div class="flex flex-col overflow-hidden border-l border-border bg-background">
		<div class="shrink-0 border-b border-border px-4 py-2">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Properties
			</h2>
		</div>
		<PropertyPanel />
	</div>
</div>
