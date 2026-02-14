<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import confettiModule from 'canvas-confetti';
	import type {
		GlobalOptions as ConfettiGlobalOptions,
		Options as ConfettiOptions,
		CreateTypes as ConfettiInstance
	} from 'canvas-confetti';

	interface Props {
		options?: ConfettiOptions;
		globalOptions?: ConfettiGlobalOptions;
		manualstart?: boolean;
		class?: string;
		children?: Snippet;
	}

	let {
		options = {},
		globalOptions = {},
		manualstart = false,
		class: className = '',
		children
	}: Props = $props();

	let canvasRef: HTMLCanvasElement;
	let instance: ConfettiInstance | null = null;

	export function fire(opts: ConfettiOptions = {}) {
		instance?.({ ...options, ...opts });
	}

	setContext('ConfettiContext', { fire });

	onMount(() => {
		instance = confettiModule.create(canvasRef, {
			...globalOptions,
			resize: true
		});

		if (!manualstart) {
			fire();
		}

		return () => {
			if (instance) {
				instance.reset();
				instance = null;
			}
		};
	});
</script>

<div>
	<canvas bind:this={canvasRef} class={className} aria-hidden="true"></canvas>
	{#if children}
		{@render children()}
	{/if}
</div>
