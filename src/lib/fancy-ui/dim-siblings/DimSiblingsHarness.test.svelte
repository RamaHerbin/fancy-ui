<!--
  Test-only rig: `createRawSnippet` (the usual way these test files pass a
  `children` snippet) can only return HTML for a single root element, but
  DimSiblings' whole point is dimming *siblings* — this proves real Svelte
  markup with several top-level children still lands as direct children of
  the rendered root, which a single-root raw snippet can't exercise. Not
  exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported and rendered from DimSiblings.test.ts.
-->
<script lang="ts">
	import DimSiblings from "./DimSiblings.svelte";
</script>

<DimSiblings>
	<a href="#a">One</a>
	<a href="#b">Two</a>
	<a href="#c">Three</a>
</DimSiblings>
