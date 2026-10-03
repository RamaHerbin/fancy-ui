<!--
	MotionToggle — the visitor's switch for the site's decorative motion
	(halos, rims, the petrol film). It does not touch the OS setting: when the
	system already asks for reduced motion, the switch shows as pressed and
	disabled and says why.

	State is read after mount only: the store hydrates from localStorage and
	matchMedia at import, so rendering it during hydration would disagree with
	the server's markup.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { createMotionState } from "$lib/stores/motion.svelte.js";

	interface Props {
		/** Hide the text label (icon only; the accessible name stays). */
		compact?: boolean;
		class?: string;
	}

	let { compact = false, class: className = "" }: Props = $props();

	const motion = createMotionState();
	let mounted = $state(false);
	onMount(() => (mounted = true));

	const system = $derived(mounted && motion.reducedMotion);
	const pressed = $derived(mounted && (motion.userPaused || motion.reducedMotion));
	const label = $derived(pressed ? "Resume motion" : "Pause motion");
</script>

<button
	type="button"
	class="mt fx-mono {className}"
	aria-pressed={pressed}
	aria-label={compact ? label : undefined}
	disabled={system}
	title={system ? "Reduced motion is on in your system" : undefined}
	onclick={() => motion.toggle()}
>
	<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
		{#if pressed}
			<path d="M5 3.5v9l7-4.5z" fill="currentColor" />
		{:else}
			<path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
		{/if}
	</svg>
	{#if !compact}<span>{label}</span>{/if}
</button>

<style>
	.mt {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 30px;
		padding: 0 10px;
		border-radius: 8px;
		font-size: 10.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--fx-ink-3, #8f8e89);
		box-shadow: inset 0 0 0 1px var(--fx-hairline, rgba(242, 241, 236, 0.1));
		cursor: pointer;
		transition:
			color 180ms var(--fx-ease, ease),
			background-color 180ms var(--fx-ease, ease);
	}

	.mt:hover:not(:disabled) {
		color: var(--fx-ink, #f2f1ec);
	}

	.mt[aria-pressed="true"] {
		color: var(--fx-ink-2, #a8a7a1);
		background: var(--fx-card-raised, #15151a);
	}

	.mt:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.mt:focus-visible {
		outline: 1px solid var(--fx-ink, #f2f1ec);
		outline-offset: 2px;
	}
</style>
