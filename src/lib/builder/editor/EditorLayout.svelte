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

<div class="grid h-screen grid-cols-[240px_1fr_320px]">
	<!-- Left panel: Palette + Layer Tree -->
	<div class="flex flex-col border-r border-border bg-background">
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
	<div class="overflow-y-auto border-l border-border bg-background">
		<div class="shrink-0 border-b border-border px-4 py-2">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Properties
			</h2>
		</div>
		<PropertyPanel />
	</div>
</div>
