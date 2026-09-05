<!--
  Test-only composition rig. Snippets that mount components cannot be built from
  a `.ts` test file, so the parts get exercised through real markup here — which
  is also the only way to prove they read the context the root actually
  publishes, rather than one the test invented. Not exported from index.ts, and
  not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import ChatMessage from "./ChatMessage.svelte";
	import ChatMessageActions from "./ChatMessageActions.svelte";
	import ChatMessageAction from "./ChatMessageAction.svelte";
	import ChatMessageBranches from "./ChatMessageBranches.svelte";

	interface Props {
		role?: "user" | "assistant" | "system";
		content?: string;
		alwaysVisible?: boolean;
		index?: number;
		count?: number;
		onNavigate?: (index: number) => void;
		onCopy?: () => void;
		sound?: boolean;
	}

	let {
		role = "assistant",
		content = "The answer",
		alwaysVisible = false,
		index = 2,
		count = 3,
		onNavigate = () => {},
		onCopy = () => {},
		sound = false,
	}: Props = $props();
</script>

<ChatMessage {role} {content} {sound}>
	{#snippet actions()}
		<ChatMessageActions {alwaysVisible}>
			<ChatMessageAction label="Copy" confirmLabel="Copied" onclick={onCopy}>
				<span aria-hidden="true">C</span>
			</ChatMessageAction>
		</ChatMessageActions>
	{/snippet}

	{#snippet footer()}
		<ChatMessageBranches {index} {count} {onNavigate} />
	{/snippet}
</ChatMessage>
