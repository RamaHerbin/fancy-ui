<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file, so the
  bindable `state` is bound here and echoed into the DOM, which is the only way
  to prove the decision travels back out to the consumer rather than merely
  changing what the card draws. Not exported from index.ts, and not collected by
  Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import ApprovalCard from "./ApprovalCard.svelte";
	import type { ApprovalState } from "./ApprovalCard.svelte";

	interface Props {
		title: string;
		description?: string;
		state?: ApprovalState;
		destructive?: boolean;
		busy?: boolean;
		onApprove?: () => void;
		onDeny?: () => void;
	}

	let {
		title,
		description,
		state = $bindable("pending"),
		destructive = false,
		busy = false,
		onApprove,
		onDeny,
	}: Props = $props();
</script>

<ApprovalCard {title} {description} bind:state {destructive} {busy} {onApprove} {onDeny} />

<span data-testid="bound-state">{state}</span>
