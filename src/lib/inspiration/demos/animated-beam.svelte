<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { AnimatedBeam } from "$lib/fancy-ui/animated-beam";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import Database from "@lucide/svelte/icons/database";

	let { values }: { values: PlaygroundValues } = $props();

	let container = $state<HTMLElement>();
	let from = $state<HTMLElement>();
	let to = $state<HTMLElement>();

	const node =
		"relative z-10 flex size-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#141416] text-neutral-300";
</script>

<div
	bind:this={container}
	class="relative flex h-full w-full items-center justify-between overflow-hidden bg-[#0b0b0c] px-[14%]"
>
	<div bind:this={from} class={node}><Database class="size-5" strokeWidth={1.5} /></div>
	<div bind:this={to} class={node}><Sparkles class="size-5" strokeWidth={1.5} /></div>
	{#if container && from && to}
		<AnimatedBeam
			containerRef={container}
			fromRef={from}
			toRef={to}
			curvature={values.curvature as number}
			pulses={values.pulses as number}
			tail={0.45}
			glow={0.8}
			gradientStartColor="#7dd3fc"
			gradientStopColor="#a78bfa"
		/>
	{/if}
</div>
