<script lang="ts">
	import { onMount } from 'svelte';
	import { getEditorState, type Viewport } from '../stores/editor.svelte.js';
	import { deleteDraft } from '../storage/indexeddb.js';
	import { Monitor, Tablet, Smartphone, ArrowLeft, Save, MousePointer, Hand, Loader2, Check, Undo2, Redo2 } from '@lucide/svelte';

	const editor = getEditorState();

	// Wire Cmd+S → handleSave
	onMount(() => {
		editor.onSave = handleSave;
		return () => {
			editor.onSave = null;
		};
	});

	const viewportOptions: { icon: typeof Monitor; value: Viewport; label: string }[] = [
		{ icon: Monitor, value: 'desktop', label: 'Desktop' },
		{ icon: Tablet, value: 'tablet', label: 'Tablet' },
		{ icon: Smartphone, value: 'mobile', label: 'Mobile' }
	];

	let saveState: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');
	let saveError: string = $state('');

	async function handleSave() {
		if (saveState === 'saving') return;

		saveState = 'saving';
		saveError = '';

		try {
			const res = await fetch(`/api/builder/pages/${editor.page.meta.slug}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editor.page)
			});

			const data = await res.json().catch(() => ({ message: 'Save failed' }));

			if (!res.ok) {
				throw new Error(data.message || `Save failed (${res.status})`);
			}

			// Sync updatedAt from server response (bypass history — not undoable)
			if (data.updatedAt) {
				editor.page.meta.updatedAt = data.updatedAt;
			}

			// Clear draft from IndexedDB after successful save
			deleteDraft(editor.page.meta.slug).catch(() => {});

			saveState = 'saved';
			setTimeout(() => {
				if (saveState === 'saved') saveState = 'idle';
			}, 2000);
		} catch (err) {
			saveState = 'error';
			saveError = err instanceof Error ? err.message : 'Save failed';
			setTimeout(() => {
				if (saveState === 'error') saveState = 'idle';
			}, 3000);
		}
	}
</script>

<div
	class="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-background px-4"
>
	<!-- Left: Back link -->
	<a href="/builder" class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
		<ArrowLeft class="h-4 w-4" />
		Builder
	</a>

	<!-- Center: Editable title -->
	<div class="flex flex-1 justify-center">
		<input
			type="text"
			class="h-8 max-w-xs rounded-md border border-transparent bg-transparent px-2 text-center text-sm font-medium hover:border-border focus:border-border focus:ring-2 focus:ring-ring focus:outline-none"
			value={editor.page.meta.title}
			oninput={(e) => editor.updatePageMeta('title', e.currentTarget.value)}
		/>
	</div>

	<!-- Right: Viewport toggles + Save -->
	<div class="flex items-center gap-1">
		{#each viewportOptions as { icon: Icon, value, label }}
			<button
				type="button"
				class="rounded-md p-1.5 transition-colors {editor.viewport === value
					? 'bg-accent text-accent-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
				title={label}
				onclick={() => (editor.viewport = value)}
			>
				<Icon class="h-4 w-4" />
			</button>
		{/each}

		<div class="mx-2 h-5 w-px bg-border"></div>

		<!-- Undo / Redo -->
		<button
			type="button"
			class="rounded-md p-1.5 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
			title="Undo (Ctrl+Z)"
			disabled={!editor.canUndo}
			onclick={() => editor.undo()}
		>
			<Undo2 class="h-4 w-4" />
		</button>
		<button
			type="button"
			class="rounded-md p-1.5 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
			title="Redo (Ctrl+Shift+Z)"
			disabled={!editor.canRedo}
			onclick={() => editor.redo()}
		>
			<Redo2 class="h-4 w-4" />
		</button>

		<div class="mx-2 h-5 w-px bg-border"></div>

		<!-- Edit/Interact mode toggle -->
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors {editor.mode === 'interact'
				? 'bg-accent text-accent-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			title={editor.mode === 'edit' ? 'Switch to Interact mode' : 'Switch to Edit mode'}
			onclick={() => editor.toggleMode()}
		>
			{#if editor.mode === 'edit'}
				<MousePointer class="h-4 w-4" />
			{:else}
				<Hand class="h-4 w-4" />
			{/if}
			<span class="text-xs">{editor.mode === 'edit' ? 'Edit' : 'Interact'}</span>
		</button>

		<div class="mx-2 h-5 w-px bg-border"></div>

		{#if saveState === 'error'}
			<span class="text-xs text-destructive">{saveError}</span>
		{/if}

		<button
			type="button"
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {saveState === 'saved'
				? 'bg-green-600 text-white'
				: saveState === 'error'
					? 'bg-destructive text-destructive-foreground'
					: 'bg-primary text-primary-foreground hover:bg-primary/90'}"
			onclick={handleSave}
			disabled={saveState === 'saving'}
		>
			{#if saveState === 'saving'}
				<Loader2 class="h-3.5 w-3.5 animate-spin" />
				Saving...
			{:else if saveState === 'saved'}
				<Check class="h-3.5 w-3.5" />
				Saved
			{:else}
				<Save class="h-3.5 w-3.5" />
				Save
			{/if}
		</button>
	</div>
</div>
