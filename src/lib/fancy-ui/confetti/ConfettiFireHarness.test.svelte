<script lang="ts">
	import Confetti from "./Confetti.svelte";
	import type { Options as ConfettiOptions } from "canvas-confetti";

	let opts = $state<ConfettiOptions>({ particleCount: 50 });
	let confetti = $state<{ fire: (o?: ConfettiOptions) => void } | undefined>();

	/**
	 * Reassigns `options` to a NEW object and fires in the same tick, before any
	 * effect flush — the exact shape a click handler takes.
	 */
	export function bumpAndFireSameTick() {
		opts = { particleCount: 500 };
		confetti?.fire();
	}
</script>

<Confetti bind:this={confetti} options={opts} manualStart />
