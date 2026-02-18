<script lang="ts">
	import { getEditorState } from '../stores/editor.svelte.js';
	import StringEditor from './props/StringEditor.svelte';
	import NumberEditor from './props/NumberEditor.svelte';
	import BooleanEditor from './props/BooleanEditor.svelte';
	import ColorEditor from './props/ColorEditor.svelte';
	import SelectEditor from './props/SelectEditor.svelte';

	const editor = getEditorState();

	function handlePropChange(key: string, value: unknown) {
		if (!editor.selectedBlockId) return;
		editor.updateBlockProp(editor.selectedBlockId, key, value);
	}
</script>

<div class="flex h-full flex-col">
	{#if editor.selectedBlock && editor.selectedMeta}
		{@const block = editor.selectedBlock}
		{@const meta = editor.selectedMeta}

		<div class="border-b border-border px-4 py-3">
			<h3 class="text-sm font-semibold">{meta.name}</h3>
			<p class="text-xs text-muted-foreground">{meta.slug}</p>
		</div>

		<div class="flex-1 space-y-4 overflow-y-auto p-4">
			{#each Object.entries(meta.propSchemas) as [key, schema]}
				<div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="mb-1.5 block text-xs font-medium text-muted-foreground">
						{schema.label}
						{#if schema.description}
							<span class="ml-1 text-muted-foreground/60" title={schema.description}>?</span>
						{/if}
					</label>
					{#if schema.type === 'string' || schema.type === 'image'}
						<StringEditor
							value={String(block.props[key] ?? schema.default ?? '')}
							{schema}
							onchange={(v) => handlePropChange(key, v)}
						/>
					{:else if schema.type === 'number'}
						<NumberEditor
							value={Number(block.props[key] ?? schema.default ?? 0)}
							{schema}
							onchange={(v) => handlePropChange(key, v)}
						/>
					{:else if schema.type === 'boolean'}
						<BooleanEditor
							value={Boolean(block.props[key] ?? schema.default ?? false)}
							{schema}
							onchange={(v) => handlePropChange(key, v)}
						/>
					{:else if schema.type === 'color'}
						<ColorEditor
							value={String(block.props[key] ?? schema.default ?? '#000000')}
							{schema}
							onchange={(v) => handlePropChange(key, v)}
						/>
					{:else if schema.type === 'select'}
						<SelectEditor
							value={String(block.props[key] ?? schema.default ?? '')}
							{schema}
							onchange={(v) => handlePropChange(key, v)}
						/>
					{:else if schema.type === 'json'}
						<textarea
							class="h-20 w-full resize-y rounded-md border border-border bg-input px-3 py-2 font-mono text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
							value={JSON.stringify(block.props[key] ?? schema.default, null, 2)}
							oninput={(e) => {
								try {
									const parsed = JSON.parse(e.currentTarget.value);
									handlePropChange(key, parsed);
								} catch {
									// Invalid JSON, ignore
								}
							}}
						></textarea>
					{/if}
				</div>
			{/each}
		</div>

		<div class="border-t border-border p-4">
			<button
				type="button"
				class="w-full rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
				onclick={() => editor.removeBlock(block.id)}
			>
				Delete Block
			</button>
		</div>
	{:else}
		<div class="flex flex-1 items-center justify-center p-6 text-center">
			<p class="text-sm text-muted-foreground">Select a block to edit its properties</p>
		</div>
	{/if}
</div>
