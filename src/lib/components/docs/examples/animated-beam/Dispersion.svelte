<script lang="ts">
	import { AnimatedBeam } from "$lib/fancy-ui/animated-beam";
	import Cloud from "@lucide/svelte/icons/cloud";
	import Laptop from "@lucide/svelte/icons/laptop";

	let containerRef = $state<HTMLElement>();
	let leftRef = $state<HTMLElement>();
	let rightRef = $state<HTMLElement>();

	const node =
		"relative z-10 rounded-2xl border border-black/[0.08] bg-[#fafafa] p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#141416] dark:shadow-none";
	const well =
		"flex size-14 items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-700 dark:border-white/[0.06] dark:bg-[#0b0b0c] dark:text-neutral-300";
</script>

<div
	class="w-full rounded-[22px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
>
	<div
		bind:this={containerRef}
		class="relative flex h-[300px] w-full items-center justify-between overflow-hidden rounded-2xl border border-black/[0.06] bg-[#fafafa] px-10 sm:px-20 dark:border-white/[0.06] dark:bg-[#111113]"
	>
		<div bind:this={leftRef} class={node}>
			<div class={well}><Laptop class="size-5" strokeWidth={1.5} /></div>
		</div>
		<div bind:this={rightRef} class={node}>
			<div class={well}><Cloud class="size-5" strokeWidth={1.5} /></div>
		</div>

		{#if containerRef && leftRef && rightRef}
			<!-- Upload: three packets in flight, long cool tail, strong glow. -->
			<AnimatedBeam
				{containerRef}
				fromRef={leftRef}
				toRef={rightRef}
				curvature={70}
				startYOffset={-10}
				endYOffset={-10}
				pulses={3}
				tail={0.5}
				glow={0.9}
				duration={4.5}
				gradientStartColor="#7dd3fc"
				gradientStopColor="#a78bfa"
			/>
			<!-- Download: the same fibre run backwards, short warm tail, faint glow. -->
			<AnimatedBeam
				{containerRef}
				fromRef={leftRef}
				toRef={rightRef}
				curvature={-70}
				startYOffset={10}
				endYOffset={10}
				reverse
				pulses={2}
				tail={0.22}
				glow={0.35}
				duration={5.5}
				delay={0.8}
				gradientStartColor="#fcd34d"
				gradientStopColor="#f472b6"
			/>
		{/if}
	</div>
</div>
