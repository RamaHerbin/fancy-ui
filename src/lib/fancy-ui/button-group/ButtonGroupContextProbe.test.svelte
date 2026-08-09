<!--
  Test-only. `getContext` only resolves inside a component's own
  initialization, so proving ButtonGroup publishes an orientation a nested
  control can read requires mounting a real child that asks for it — a `.ts`
  test cannot call `getContext` on its own behalf. Not exported from
  index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import { getContext } from "svelte";
	import { BUTTON_GROUP_CONTEXT_KEY, type ButtonGroupContext } from "./types.js";

	const context = getContext<ButtonGroupContext | undefined>(BUTTON_GROUP_CONTEXT_KEY);
</script>

<span data-testid="context-orientation">{context?.orientation ?? "none"}</span>
