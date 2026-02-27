<script lang="ts">
	import { getEditorState } from "../stores/editor.svelte.js";
	import { saveDraft } from "../storage/indexeddb.js";

	const editor = getEditorState();

	let lastSavedJson = $state(JSON.stringify(editor.page));
	let showIndicator = $state(false);
	let indicatorTimer: ReturnType<typeof setTimeout> | null = null;

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
				if (indicatorTimer) clearTimeout(indicatorTimer);
				indicatorTimer = setTimeout(() => {
					showIndicator = false;
				}, 1500);
			} catch {
				// Silently ignore IndexedDB errors
			}
		}, 5000);

		return () => clearTimeout(timeout);
	});
</script>

{#if showIndicator}
	<div
		class="bg-muted text-muted-foreground fixed right-4 bottom-4 z-50 rounded-md px-3 py-1.5 text-xs shadow-sm"
	>
		Draft saved
	</div>
{/if}
