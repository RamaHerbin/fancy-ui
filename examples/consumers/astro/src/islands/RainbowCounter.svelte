<script lang="ts">
	// An island wrapper: the handler and the state live here, in a .svelte
	// file, because a function cannot cross from .astro to a hydrated island.
	// Importing RainbowButton here (not in the .astro page) also keeps the
	// island's chunk to this component instead of the whole library.
	import { RainbowButton } from "fancy-ui-svelte";
	import type { Snippet } from "svelte";
	import { trackLifecycle } from "./lifecycle";

	let { id, children }: { id: string; children?: Snippet } = $props();
	let clicks = $state(0);

	trackLifecycle(`rainbow:${id}`);
</script>

<div class="flex items-center gap-3" data-testid={id} data-hydrated="true">
	<RainbowButton onclick={() => clicks++}>{@render children?.()}</RainbowButton>
	<span data-testid="{id}-clicks">clicks: {clicks}</span>
</div>
