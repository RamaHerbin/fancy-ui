<!--
  CanvasBlockRenderer - Like BlockRenderer but wraps every block in BlockWrapper.
  Used in the editor canvas for selection/interaction.
-->
<script lang="ts">
	import type { BlockNode } from "../types/page.js";
	import { resolveComponent } from "../renderer/component-map.js";
	import { getBuilderComponent } from "../registry/builder-registry.js";
	import { getEditorState } from "../stores/editor.svelte.js";
	import BlockWrapper from "./BlockWrapper.svelte";
	import InlineTextEditor from "./InlineTextEditor.svelte";
	import CanvasBlockRendererSelf from "./CanvasBlockRenderer.svelte";

	interface Props {
		node: BlockNode;
	}

	let { node }: Props = $props();

	const editor = getEditorState();

	let Component = $derived(resolveComponent(node.type));
	let meta = $derived(getBuilderComponent(node.type));
	let hasChildren = $derived(meta?.acceptsChildren && node.children && node.children.length > 0);
	let isInlineEditing = $derived(node.type === "_text" && editor.inlineEditBlockId === node.id);
</script>

<BlockWrapper blockId={node.id}>
	{#if isInlineEditing}
		<InlineTextEditor
			blockId={node.id}
			content={node.props.content as string}
			tag={node.props.tag as string}
			class={node.props.class as string}
		/>
	{:else if Component}
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
		<div class="border-destructive/50 text-destructive rounded border border-dashed p-4 text-sm">
			Unknown component: <code>{node.type}</code>
		</div>
	{/if}
</BlockWrapper>
