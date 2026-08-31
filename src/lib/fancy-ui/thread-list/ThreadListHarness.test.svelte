<!--
  Test-only rig. A bindable prop can only be proven to write outwards from real
  markup, so `activeId` is bound here and echoed into the DOM where a test can
  watch it. Snippets that render markup cannot be built from a `.ts` file
  either, so the `item` and `empty` overrides live here too. Not exported from
  index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import type { ThreadData } from "../_internals/ai-types.js";
	import ThreadList from "./ThreadList.svelte";

	interface Props {
		threads: ThreadData[];
		activeId?: string;
		onSelect?: (thread: ThreadData) => void;
		onDelete?: (thread: ThreadData) => void;
		label?: string;
		/** Swaps the default row body for the local `row` snippet below. */
		customItem?: boolean;
		/** Swaps the default empty line for the local `blank` snippet below. */
		customEmpty?: boolean;
		sound?: boolean;
	}

	let {
		threads,
		activeId = $bindable(),
		onSelect,
		onDelete,
		label,
		customItem = false,
		customEmpty = false,
		sound = false,
	}: Props = $props();

	// `ref` can only be proven to hand back the real root by marking whatever comes
	// out of it and then looking for the mark on the rendered list.
	let root = $state<HTMLElement | null>(null);
	$effect(() => {
		root?.setAttribute("data-bound-ref", "yes");
	});
</script>

{#snippet row(thread: ThreadData, active: boolean)}
	<span data-testid="custom-item">{thread.title}:{active}</span>
{/snippet}

{#snippet blank()}
	<span data-testid="custom-empty">Start a conversation</span>
{/snippet}

<ThreadList
	{threads}
	bind:activeId
	bind:ref={root}
	{onSelect}
	{onDelete}
	{label}
	{sound}
	item={customItem ? row : undefined}
	empty={customEmpty ? blank : undefined}
/>

<span data-testid="bound-active">{activeId ?? ""}</span>
