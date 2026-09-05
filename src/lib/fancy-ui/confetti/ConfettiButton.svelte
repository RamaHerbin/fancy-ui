<script lang="ts">
	import { getContext } from "svelte";
	import type { Snippet } from "svelte";
	import confetti from "canvas-confetti";
	import type { Options as ConfettiOptions } from "canvas-confetti";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	interface Props {
		options?: ConfettiOptions;
		children?: Snippet;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}

	let { options = {}, children, sound = false }: Props = $props();

	const confettiContext = getContext<{ fire: (opts?: ConfettiOptions) => void } | undefined>(
		"ConfettiContext"
	);

	function handleClick(event: MouseEvent) {
		if (sound) soundFx.play("press");
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;

		const origin = {
			x: x / window.innerWidth,
			y: y / window.innerHeight,
		};

		if (confettiContext) {
			confettiContext.fire({ ...options, origin });
		} else {
			confetti({ ...options, origin });
		}
	}
</script>

<button onclick={handleClick}>
	{#if children}
		{@render children()}
	{/if}
</button>
