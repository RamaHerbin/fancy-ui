<!--
  CanvasBlockRenderer - Like BlockRenderer but wraps every block in BlockWrapper.
  Used in the editor canvas for selection/interaction.
-->
<script lang="ts">
	import type { BlockNode } from '../types/page.js';
	import { resolveComponent } from '../renderer/component-map.js';
	import { getBuilderComponent } from '../registry/builder-registry.js';
	import BlockWrapper from './BlockWrapper.svelte';
	import CanvasBlockRendererSelf from './CanvasBlockRenderer.svelte';

	interface Props {
		node: BlockNode;
	}

	let { node }: Props = $props();

	let Component = $derived(resolveComponent(node.type));
	let meta = $derived(getBuilderComponent(node.type));
	let hasChildren = $derived(
		meta?.acceptsChildren && node.children && node.children.length > 0
	);
</script>

<BlockWrapper blockId={node.id}>
	{#if Component}
		{#if hasChildren}
			{@const childNodes = node.children!}
			<Component {...node.props}>
				{#snippet children()}
					{#each childNodes as child (child.id)}
						<CanvasBlockRendererSelf node={child} />
					{/each}
				{/snippet}
			</Component>
		{:else}
			<Component {...node.props} />
		{/if}
	{:else}
		<div
			class="rounded border border-dashed border-destructive/50 p-4 text-sm text-destructive"
		>
			Unknown component: <code>{node.type}</code>
		</div>
	{/if}
</BlockWrapper>
