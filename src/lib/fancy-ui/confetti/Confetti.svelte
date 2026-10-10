<script lang="ts">
	import { onMount, setContext } from "svelte";
	import type { Snippet } from "svelte";
	import type {
		GlobalOptions as ConfettiGlobalOptions,
		Options as ConfettiOptions,
	} from "canvas-confetti";
	import { createConfetti, type ConfettiEngine } from "./confetti-core.js";

	interface Props {
		options?: ConfettiOptions;
		globalOptions?: ConfettiGlobalOptions;
		manualStart?: boolean;
		class?: string;
		children?: Snippet;
	}

	let {
		options = {},
		globalOptions = {},
		manualStart = false,
		class: className = "",
		children,
	}: Props = $props();

	let canvasRef: HTMLCanvasElement;
	let engine: ConfettiEngine | null = null;

	// `options` is live, and it was read synchronously inside `fire()` before
	// the extraction — so it is pushed here at call time rather than from a
	// deferred `$effect`, which would make a same-tick `options = …; fire()`
	// use the previous value.
	export function fire(opts: ConfettiOptions = {}) {
		engine?.setOptions({ options });
		engine?.fire(opts);
	}

	setContext("ConfettiContext", { fire });

	onMount(() => {
		engine = createConfetti({ canvas: canvasRef }, { globalOptions, manualStart, options });

		return () => {
			engine?.destroy();
			engine = null;
		};
	});
</script>

<div>
	<canvas bind:this={canvasRef} class={className} aria-hidden="true"></canvas>
	{#if children}
		{@render children()}
	{/if}
</div>
