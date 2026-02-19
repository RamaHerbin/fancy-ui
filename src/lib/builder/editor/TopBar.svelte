<script lang="ts">
	import { getEditorState, type Viewport } from '../stores/editor.svelte.js';
	import { Monitor, Tablet, Smartphone, ArrowLeft, Save, MousePointer, Hand } from '@lucide/svelte';

	const editor = getEditorState();

	const viewportOptions: { icon: typeof Monitor; value: Viewport; label: string }[] = [
		{ icon: Monitor, value: 'desktop', label: 'Desktop' },
		{ icon: Tablet, value: 'tablet', label: 'Tablet' },
		{ icon: Smartphone, value: 'mobile', label: 'Mobile' }
	];

	function handleSave() {
		console.log('Save page:', JSON.stringify(editor.page, null, 2));
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

		<button
			type="button"
			class="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			onclick={handleSave}
		>
			<Save class="h-3.5 w-3.5" />
			Save
		</button>
	</div>
</div>
