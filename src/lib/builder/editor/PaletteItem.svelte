<script lang="ts">
	import type { BuilderComponentMeta } from '../types/registry.js';
	import { getIcon } from './IconMap.js';
	import { getEditorState } from '../stores/editor.svelte.js';

	interface Props {
		meta: BuilderComponentMeta;
	}

	let { meta }: Props = $props();

	const editor = getEditorState();
	let Icon = $derived(getIcon(meta.icon));

	function handleClick() {
		// If a container is selected, add as child; otherwise add to root
		const parentId =
			editor.selectedBlock && editor.selectedMeta?.acceptsChildren
				? editor.selectedBlockId
				: null;
		editor.addBlock(meta.slug, parentId);
	}
</script>

<button
	type="button"
	class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
	onclick={handleClick}
	title={meta.description}
>
	<Icon class="h-4 w-4 shrink-0 text-muted-foreground" />
	<span class="truncate">{meta.name}</span>
</button>
