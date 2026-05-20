<script lang="ts">
	import { AnimatedBeam } from "$lib/fancy-ui/animated-beam";

	let containerRef: HTMLElement;
	let div1Ref: HTMLElement;
	let div2Ref: HTMLElement;
	let div3Ref: HTMLElement;
	let div4Ref: HTMLElement;
	let div5Ref: HTMLElement;
	let div6Ref: HTMLElement;
	let div7Ref: HTMLElement;
</script>

<div
	bind:this={containerRef}
	class="bg-background relative flex h-[500px] w-full items-center justify-center overflow-hidden rounded-lg border p-10 md:shadow-xl"
>
	<div class="flex size-full max-h-[200px] max-w-lg flex-col items-stretch justify-between gap-10">
		<div class="flex flex-row items-center justify-between">
			<div bind:this={div1Ref} class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-blue-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]">
				<span class="text-sm font-bold text-white">1</span>
			</div>
			<div bind:this={div5Ref} class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-green-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]">
				<span class="text-sm font-bold text-white">5</span>
			</div>
		</div>
		<div class="flex flex-row items-center justify-between">
			<div bind:this={div2Ref} class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-purple-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]">
				<span class="text-sm font-bold text-white">2</span>
			</div>
			<div bind:this={div4Ref} class="z-10 flex size-16 items-center justify-center rounded-full border-2 bg-orange-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]">
				<span class="text-lg font-bold text-white">HUB</span>
			</div>
			<div bind:this={div6Ref} class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-pink-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]">
				<span class="text-sm font-bold text-white">6</span>
			</div>
		</div>
		<div class="flex flex-row items-center justify-between">
			<div bind:this={div3Ref} class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-red-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]">
				<span class="text-sm font-bold text-white">3</span>
			</div>
			<div bind:this={div7Ref} class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-teal-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]">
				<span class="text-sm font-bold text-white">7</span>
			</div>
		</div>
	</div>

	{#if containerRef && div1Ref && div4Ref}
		<AnimatedBeam {containerRef} fromRef={div1Ref} toRef={div4Ref} curvature={-75} endYOffset={-10} />
	{/if}
	{#if containerRef && div2Ref && div4Ref}
		<AnimatedBeam {containerRef} fromRef={div2Ref} toRef={div4Ref} />
	{/if}
	{#if containerRef && div3Ref && div4Ref}
		<AnimatedBeam {containerRef} fromRef={div3Ref} toRef={div4Ref} curvature={75} endYOffset={10} />
	{/if}
	{#if containerRef && div5Ref && div4Ref}
		<AnimatedBeam {containerRef} fromRef={div5Ref} toRef={div4Ref} curvature={-75} endYOffset={-10} reverse={true} />
	{/if}
	{#if containerRef && div6Ref && div4Ref}
		<AnimatedBeam {containerRef} fromRef={div6Ref} toRef={div4Ref} reverse={true} />
	{/if}
	{#if containerRef && div7Ref && div4Ref}
		<AnimatedBeam {containerRef} fromRef={div7Ref} toRef={div4Ref} curvature={75} endYOffset={10} reverse={true} />
	{/if}
</div>
