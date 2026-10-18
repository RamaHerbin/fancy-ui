<!--
  Test-only rig. The magnification guard lives across Dock and DockIcon
  together — Dock owns the two media queries and publishes the resulting
  `magnify` flag on its context, DockIcon reads it before sizing itself —
  so proving it needs real instances of both, wired the way a consumer would.
  Raw HTML from a `.ts` test file carries no context, so a DockIcon built that
  way could never see the flag at all. Not exported from index.ts, and not
  collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import Dock from "./Dock.svelte";
	import DockIcon from "./DockIcon.svelte";
	import DockSeparator from "./DockSeparator.svelte";

	interface Props {
		magnification?: number;
		distance?: number;
		orientation?: "horizontal" | "vertical";
		spotlight?: boolean;
		reflection?: boolean;
		ariaLabel?: string;
		withSeparator?: boolean;
	}

	let {
		magnification = 60,
		distance = 140,
		orientation = "horizontal",
		spotlight = true,
		reflection = true,
		ariaLabel,
		withSeparator = false,
	}: Props = $props();
</script>

<Dock {magnification} {distance} {orientation} {spotlight} {reflection} {ariaLabel}>
	{#snippet children()}
		<DockIcon class="first-icon">
			{#snippet children()}
				<span>1</span>
			{/snippet}
		</DockIcon>
		{#if withSeparator}
			<DockSeparator />
		{/if}
		<DockIcon class="second-icon">
			{#snippet children()}
				<span>2</span>
			{/snippet}
		</DockIcon>
	{/snippet}
</Dock>
