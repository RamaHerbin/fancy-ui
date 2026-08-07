<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component never lands back on it — and binding
  here and echoing the value into the DOM is the only way to prove the recording
  state travels back out to the consumer rather than merely changing what the
  component draws. Not exported from index.ts, and not collected by Vitest (the
  run includes `*.test.ts` only).
-->
<script lang="ts">
	import VoiceInput from "./VoiceInput.svelte";

	interface Props {
		active?: boolean;
		transcript?: string;
		demo?: boolean;
		onStart?: () => void;
		onStop?: () => void;
		onCancel?: () => void;
	}

	let {
		active = $bindable(false),
		transcript = "",
		demo = false,
		onStart,
		onStop,
		onCancel,
	}: Props = $props();
</script>

<VoiceInput bind:active {transcript} {demo} {onStart} {onStop} {onCancel} />

<span data-testid="bound-active">{active ? "recording" : "idle"}</span>
