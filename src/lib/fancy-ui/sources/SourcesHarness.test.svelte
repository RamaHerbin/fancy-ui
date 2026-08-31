<!--
  Test-only composition rig. Snippets that mount components cannot be built from
  a `.ts` test file, so the parts get exercised through real markup here — which
  is also the only way to prove they read the context the root actually
  publishes, rather than one the test invented. The bound `open` is echoed into
  the DOM so a test can watch the binding write outwards. Not exported from
  index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import type { SourceData } from "../_internals/ai-types.js";
	import Sources from "./Sources.svelte";
	import SourcesTrigger from "./SourcesTrigger.svelte";
	import SourcesList from "./SourcesList.svelte";

	interface Props {
		sources: SourceData[];
		open?: boolean;
		label?: string;
		onToggle?: (open: boolean) => void;
		/** Swaps the default card for the local `row` snippet below. */
		customItem?: boolean;
		sound?: boolean;
	}

	let {
		sources,
		open = $bindable(false),
		label,
		onToggle,
		customItem = false,
		sound = false,
	}: Props = $props();
</script>

{#snippet row(source: SourceData, index: number)}
	<span data-testid="custom-item">{index}:{source.title}</span>
{/snippet}

<Sources {sources} bind:open {onToggle} {sound}>
	<SourcesTrigger {label} />
	<SourcesList item={customItem ? row : undefined} />
</Sources>

<span data-testid="bound-open">{open}</span>
