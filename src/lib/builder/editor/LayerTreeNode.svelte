<script lang="ts">
	import type { BlockNode } from '../types/page.js';
	import { getBuilderComponent } from '../registry/index.js';
	import { getEditorState } from '../stores/editor.svelte.js';
	import { getIcon } from './IconMap.js';
	import LayerTreeNodeSelf from './LayerTreeNode.svelte';

	interface Props {
		node: BlockNode;
		depth?: number;
	}

	let { node, depth = 0 }: Props = $props();

	const editor = getEditorState();
	let meta = $derived(getBuilderComponent(node.type));
	let Icon = $derived(meta ? getIcon(meta.icon) : null);
	let hasChildren = $derived(node.children && node.children.length > 0);
	let isSelected = $derived(editor.selectedBlockId === node.id);
	let expanded = $state(true);

	let label = $derived.by(() => {
		if (node.type === '_text') {
			const content = (node.props.content as string) ?? '';
			return content.length > 30 ? content.slice(0, 30) + '...' : content || 'Empty text';
		}
		return meta?.name ?? node.type;
	});

	function handleClick() {
		editor.selectBlock(node.id);
	}

	function toggleExpand(e: MouseEvent) {
		e.stopPropagation();
		expanded = !expanded;
	}
</script>

<div>
	<div
		role="treeitem"
		tabindex="0"
		aria-expanded={hasChildren ? expanded : undefined}
		aria-selected={isSelected}
		class="flex w-full cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 text-left text-sm transition-colors select-none {isSelected
			? 'bg-accent text-accent-foreground'
			: 'hover:bg-accent/50'}"
		style="padding-left: {depth * 16 + 4}px"
		onclick={handleClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleClick();
			}
		}}
	>
		{#if hasChildren}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span
				class="flex h-4 w-4 shrink-0 items-center justify-center"
				onclick={toggleExpand}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						e.stopPropagation();
						expanded = !expanded;
					}
				}}
			>
				<svg
					class="h-3 w-3 transition-transform {expanded ? 'rotate-90' : ''}"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
			</span>
		{:else}
			<span class="h-4 w-4 shrink-0"></span>
		{/if}

		{#if Icon}
			<Icon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
		{/if}

		<span class="truncate">{label}</span>
	</div>

	{#if hasChildren && expanded}
		{#each node.children! as child (child.id)}
			<LayerTreeNodeSelf node={child} depth={depth + 1} />
		{/each}
	{/if}
</div>
