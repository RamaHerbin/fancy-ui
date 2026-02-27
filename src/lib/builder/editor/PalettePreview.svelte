<!--
  Floating preview card shown when hovering over a palette item.
  Renders the actual component with default props inside a contained preview area.
-->
<script lang="ts">
	import type { BuilderComponentMeta } from '../types/registry.js';
	import { resolveComponent } from '../renderer/component-map.js';
	import { getDefaultProps } from '../registry/index.js';

	interface Props {
		meta: BuilderComponentMeta;
		anchorRect: DOMRect;
	}

	let { meta, anchorRect }: Props = $props();

	let Component = $derived(resolveComponent(meta.slug));
	let defaultProps = $derived(getDefaultProps(meta.slug));

	// Position the preview to the right of the palette panel
	let top = $derived(Math.max(8, Math.min(anchorRect.top, window.innerHeight - 280)));
	let left = $derived(anchorRect.right + 8);
</script>

<div
	class="fixed z-50 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
	style="top: {top}px; left: {left}px;"
	role="tooltip"
>
	<div
		class="relative flex h-48 items-center justify-center overflow-hidden bg-neutral-950 pointer-events-none"
	>
		{#if Component}
			{#key meta.slug}
				<Component {...defaultProps} />
			{/key}
		{:else}
			<p class="text-xs text-muted-foreground">Preview unavailable</p>
		{/if}
	</div>
	<div class="border-t border-border px-3 py-2">
		<p class="text-sm font-medium">{meta.name}</p>
		<p class="text-xs text-muted-foreground">{meta.description}</p>
	</div>
</div>
