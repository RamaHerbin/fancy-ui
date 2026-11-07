<script lang="ts">
	import { ContainerTextFlip } from "$lib/fancy-ui/container-text-flip";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="ContainerTextFlip"
	slug="container-text-flip"
	controls={[
		{ key: "interval", type: "range", label: "Interval (ms)", min: 800, max: 8000, step: 100 },
		{
			key: "animationDuration",
			type: "range",
			label: "Animation (ms)",
			min: 100,
			max: 2000,
			step: 50,
		},
	]}
	initialValues={{ interval: 3000, animationDuration: 700 }}
>
	{#snippet preview(values)}
		<div
			class="relative flex h-40 w-[28rem] max-w-[85vw] items-center justify-center gap-3 overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-6 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<span class="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Build</span>
			<ContainerTextFlip
				interval={values.interval as number}
				animationDuration={values.animationDuration as number}
			/>
		</div>
	{/snippet}
</PropsPlayground>
