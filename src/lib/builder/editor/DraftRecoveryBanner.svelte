<script lang="ts">
	import { getEditorState } from '../stores/editor.svelte.js';
	import { getDraft, deleteDraft, type DraftEntry } from '../storage/indexeddb.js';
	import { onMount } from 'svelte';

	const editor = getEditorState();

	let draft: DraftEntry | null = $state(null);
	let visible = $state(false);

	onMount(async () => {
		try {
			const found = await getDraft(editor.page.meta.slug);
			if (!found) return;

			// Show banner only if draft is newer than saved version
			if (found.savedAt > editor.page.meta.updatedAt) {
				draft = found;
				visible = true;
			} else {
				// Stale draft — clean up
				await deleteDraft(editor.page.meta.slug);
			}
		} catch {
			// IndexedDB unavailable
		}
	});

	async function restore() {
		if (!draft) return;
		editor.page.meta = draft.page.meta;
		editor.page.body = draft.page.body;
		await deleteDraft(editor.page.meta.slug);
		visible = false;
	}

	async function discard() {
		await deleteDraft(editor.page.meta.slug);
		visible = false;
	}
</script>

{#if visible}
	<div class="flex items-center gap-3 border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm">
		<span class="flex-1 text-yellow-700 dark:text-yellow-400">
			Unsaved draft found from {draft ? new Date(draft.savedAt).toLocaleString() : 'unknown time'}.
		</span>
		<button
			type="button"
			class="rounded-md bg-yellow-600 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-700"
			onclick={restore}
		>
			Restore
		</button>
		<button
			type="button"
			class="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
			onclick={discard}
		>
			Discard
		</button>
	</div>
{/if}
