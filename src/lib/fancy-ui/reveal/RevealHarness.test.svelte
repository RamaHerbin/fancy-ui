<!--
  Test-only harness: real Svelte template children (plain text, or an
  `{#each}` list of sibling elements), compiled the normal way. Two things
  `Reveal.test.ts` needs that a hand-built `createRawSnippet` children prop
  can't provide:
    - `count` set: N SIBLING elements as direct children (the stagger
      effect's target) — `createRawSnippet` only ever keeps ONE top-level
      node from its rendered HTML string (see
      `node_modules/svelte/.../dom/blocks/snippet.js`'s `get_first_child`),
      so a hand-rolled multi-div string silently collapses to one child.
    - `count` unset: plain text, used by the raw-`mount()` (no flushSync)
      test that reads `data-state` at its true pre-effect starting value —
      that technique needs a REAL component reference, not a snippet.
  `skipIndex`, when set, tags that one child `data-reveal-skip` so tests can
  cover the stagger opt-out without hand-building markup of their own.
  `svgIndex`, when set, renders that one child as a real `<svg>` (an
  `SVGElement`, not an `HTMLElement`) so tests can cover the stagger walk over
  a namespaced child — Svelte compiles the namespace itself, which a
  `createRawSnippet` HTML string cannot be trusted to do.
  Not exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported from Reveal.test.ts.
-->
<script lang="ts">
	import Reveal from "./Reveal.svelte";
	import type { RevealProps } from "./Reveal.svelte";

	let {
		count,
		skipIndex,
		svgIndex,
		...props
	}: { count?: number; skipIndex?: number; svgIndex?: number } & Partial<
		Omit<RevealProps, "children">
	> = $props();
</script>

<Reveal {...props}>
	{#if count}
		{#each Array.from({ length: count }) as _, i (i)}
			{#if i === svgIndex}
				<svg data-idx={i} data-reveal-skip={i === skipIndex ? "" : undefined}></svg>
			{:else}
				<div data-idx={i} data-reveal-skip={i === skipIndex ? "" : undefined}>item {i}</div>
			{/if}
		{/each}
	{:else}
		Hello
	{/if}
</Reveal>
