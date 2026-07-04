<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { AnimatedBeam } from "$lib/fancy-ui/animated-beam";

	const { Story } = defineMeta({
		title: "Effects/AnimatedBeam",
		component: AnimatedBeam,
		tags: ["autodocs"],
	});
</script>

<script lang="ts">
	// AnimatedBeam needs live element references for its container and endpoints.
	// Each story keeps its own refs so the two graphs never bind to the same
	// nodes when autodocs renders every story on one page.
	let hubContainer = $state<HTMLElement>();
	let hubA = $state<HTMLElement>();
	let hubB = $state<HTMLElement>();
	let hubC = $state<HTMLElement>();

	let curveContainer = $state<HTMLElement>();
	let curveFrom = $state<HTMLElement>();
	let curveTo = $state<HTMLElement>();
</script>

{#snippet hub()}
	<div
		bind:this={hubContainer}
		class="bg-background relative flex h-[320px] w-full items-center justify-center overflow-hidden rounded-lg border p-10"
	>
		<div class="flex size-full max-w-lg flex-col items-stretch justify-between">
			<div class="flex flex-row items-center justify-between">
				<div
					bind:this={hubA}
					class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-blue-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
				>
					<span class="text-sm font-bold text-white">A</span>
				</div>
				<div
					bind:this={hubC}
					class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-pink-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
				>
					<span class="text-sm font-bold text-white">C</span>
				</div>
			</div>
			<div class="flex flex-row items-center justify-center">
				<div
					bind:this={hubB}
					class="z-10 flex size-16 items-center justify-center rounded-full border-2 bg-orange-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
				>
					<span class="text-sm font-bold text-white">HUB</span>
				</div>
			</div>
		</div>

		{#if hubContainer && hubA && hubB}
			<AnimatedBeam containerRef={hubContainer} fromRef={hubA} toRef={hubB} curvature={40} />
		{/if}
		{#if hubContainer && hubC && hubB}
			<AnimatedBeam
				containerRef={hubContainer}
				fromRef={hubC}
				toRef={hubB}
				curvature={40}
				reverse={true}
			/>
		{/if}
	</div>
{/snippet}

<Story name="Default" template={hub} />

{#snippet curved()}
	<div
		bind:this={curveContainer}
		class="bg-background relative flex h-[280px] w-full items-center justify-between overflow-hidden rounded-lg border px-16"
	>
		<div
			bind:this={curveFrom}
			class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-violet-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
		>
			<span class="text-sm font-bold text-white">1</span>
		</div>
		<div
			bind:this={curveTo}
			class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-teal-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
		>
			<span class="text-sm font-bold text-white">2</span>
		</div>

		{#if curveContainer && curveFrom && curveTo}
			<AnimatedBeam
				containerRef={curveContainer}
				fromRef={curveFrom}
				toRef={curveTo}
				curvature={-60}
				gradientStartColor="#22d3ee"
				gradientStopColor="#a855f7"
			/>
		{/if}
	</div>
{/snippet}

<Story name="Curved" template={curved} />
