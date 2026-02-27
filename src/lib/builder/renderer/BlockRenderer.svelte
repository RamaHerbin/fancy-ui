<!--
  BlockRenderer - Recursive component renderer.

  Resolves a BlockNode's type to a Svelte component via the component map,
  passes its props, and recursively renders children.
-->
<script lang="ts" module>
	import { resolveComponent } from "./component-map.js";
	import { getBuilderComponent } from "../registry/builder-registry.js";

	const componentCache = new Map<
		string,
		{
			component: ReturnType<typeof resolveComponent>;
			meta: ReturnType<typeof getBuilderComponent>;
		}
	>();

	function getComponentInfo(type: string) {
		const cached = componentCache.get(type);
		if (cached) return cached;

		const component = resolveComponent(type);
		const meta = getBuilderComponent(type);
		const info = { component, meta };
		componentCache.set(type, info);
		return info;
	}
</script>

<script lang="ts">
	import type { BlockNode } from "../types/page.js";
	import BlockRendererSelf from "./BlockRenderer.svelte";

	interface Props {
		node: BlockNode;
	}

	let { node }: Props = $props();

	let info = $derived(getComponentInfo(node.type));
	let Component = $derived(info.component);
	let meta = $derived(info.meta);
	let hasChildren = $derived(meta?.acceptsChildren && node.children && node.children.length > 0);

	/** Only pass props that are declared in the component's propSchemas */
	let safeProps = $derived.by(() => {
		if (!meta) return node.props;
		const allowed = new Set(Object.keys(meta.propSchemas));
		const filtered: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(node.props)) {
			if (allowed.has(key)) filtered[key] = val;
		}
		return filtered;
	});
</script>

{#if Component}
	{#if hasChildren}
		{@const childNodes = node.children!}
		<Component {...safeProps}>
			{#snippet children()}
				{#each childNodes as child (child.id)}
					<BlockRendererSelf node={child} />
				{/each}
			{/snippet}
		</Component>
	{:else}
		<Component {...safeProps} />
	{/if}
{:else}
	<div class="border-destructive/50 text-destructive rounded border border-dashed p-4 text-sm">
		Unknown component: <code>{node.type}</code>
	</div>
{/if}
