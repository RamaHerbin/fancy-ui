<!--
  Test-only rig for the reveal. `loading` is held as local `$state` and
  flipped from a button inside this component, deliberately, rather than
  driven from the test through `rerender()`: `rerender` awaits a tick of its
  own, so a test using it can never observe the ONE flush the fade lives in —
  by the time it returns the stubbed animation has already resolved and the
  bones have left either way. A click flips the state synchronously, so a
  single `await tick()` after it lands inside the fade window.

  Children are a real snippet with real interactive content, because two of
  the things the reveal must guarantee are about the content, not the bones:
  that it is queryable immediately rather than after the fade, and that it is
  clickable while the bones are still painted over it.

  Not exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported and rendered from Skeleton.test.ts.
-->
<script lang="ts">
	import Skeleton from "./Skeleton.svelte";

	interface Props {
		/** Forwarded straight through, so one rig covers every variant. */
		variant?: "rect" | "text" | "circle";
		lines?: number;
		label?: string;
		/** Called when the revealed content is clicked. */
		onContentClick?: () => void;
	}

	let { variant = "text", lines = 2, label = "Loading", onContentClick }: Props = $props();

	// Always starts loading, so the first click is a genuine reveal. A rig
	// that seeded this from a prop would be reading a reactive value in a
	// non-reactive position for no gain — "mounts already revealed" is a
	// first-render question and is asserted against Skeleton directly.
	let loading = $state(true);
</script>

<button type="button" data-testid="toggle" onclick={() => (loading = !loading)}>toggle</button>

<Skeleton {loading} {variant} {lines} {label} class="w-48">
	<p>
		Real content
		<button type="button" data-testid="content-button" onclick={() => onContentClick?.()}>
			act
		</button>
	</p>
</Skeleton>
