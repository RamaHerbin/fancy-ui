<script lang="ts">
	import { getEditorState } from '../stores/editor.svelte.js';
	import { saveDraft } from '../storage/indexeddb.js';

	const editor = getEditorState();

	let lastSavedJson = $state(JSON.stringify(editor.page));
	let showIndicator = $state(false);

	$effect(() => {
		// Track editor.page deeply by serializing
		const json = JSON.stringify(editor.page);

		// Skip if nothing changed
		if (json === lastSavedJson) return;

		const timeout = setTimeout(async () => {
			try {
				await saveDraft(editor.page.meta.slug, editor.page);
				lastSavedJson = json;
				showIndicator = true;
				setTimeout(() => { showIndicator = false; }, 1500);
			} catch {
				// Silently ignore IndexedDB errors
			}
		}, 5000);

		return () => clearTimeout(timeout);
	});
</script>

{#if showIndicator}
	<div class="fixed bottom-4 right-4 z-50 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
		Draft saved
	</div>
{/if}
