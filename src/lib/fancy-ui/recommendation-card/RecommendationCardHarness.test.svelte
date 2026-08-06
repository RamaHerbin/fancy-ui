<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file, so the
  bindable `state` is bound here and echoed into the DOM, which is the only way
  to prove the answer travels back out to the consumer rather than merely
  changing what the card draws. Not exported from index.ts, and not collected by
  Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import RecommendationCard from "./RecommendationCard.svelte";
	import type { RecommendationState } from "./RecommendationCard.svelte";

	interface Props {
		title: string;
		description?: string;
		confidence?: number;
		state?: RecommendationState;
		onAccept?: () => void;
		onDismiss?: () => void;
	}

	let {
		title,
		description,
		confidence,
		state = $bindable("open"),
		onAccept,
		onDismiss,
	}: Props = $props();
</script>

<RecommendationCard {title} {description} {confidence} bind:state {onAccept} {onDismiss} />

<span data-testid="bound-state">{state}</span>
