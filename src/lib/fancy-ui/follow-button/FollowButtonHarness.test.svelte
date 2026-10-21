<!--
  Test-only rig. `bind:following` cannot be expressed from a `.ts` test: the
  props object handed to `render` is copied into the component's own state, so
  a write inside the component never lands back on it. Binding here and echoing
  the value into the DOM is the only way to prove the committed value travels
  back out to the consumer. Not exported, and not collected by Vitest (the run
  includes `*.test.ts` only).
-->
<script lang="ts">
	import FollowButton from "./FollowButton.svelte";

	interface Props {
		following?: boolean;
		onToggle?: (next: boolean) => void | Promise<void>;
		onFollowingChange?: (following: boolean) => void;
	}

	let { following = $bindable(false), onToggle, onFollowingChange }: Props = $props();
</script>

<FollowButton bind:following {onToggle} {onFollowingChange} label="Follow Rama" />

<span data-testid="bound-following">{following}</span>
<button type="button" data-testid="parent-set" onclick={() => (following = !following)}>set</button>
