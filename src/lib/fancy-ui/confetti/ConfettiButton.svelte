<script lang="ts">
	import { getContext } from "svelte";
	import type { Snippet } from "svelte";
	import confetti from "canvas-confetti";
	import type { Options as ConfettiOptions } from "canvas-confetti";

	interface Props {
		options?: ConfettiOptions;
		children?: Snippet;
	}

	let { options = {}, children }: Props = $props();

	const confettiContext = getContext<{ fire: (opts?: ConfettiOptions) => void } | undefined>(
		"ConfettiContext"
	);

	function handleClick(event: MouseEvent) {
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
