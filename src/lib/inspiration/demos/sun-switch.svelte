<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { SunSwitch } from "$lib/fancy-ui/sun-switch";

	let { values }: { values: PlaygroundValues } = $props();

	// Contained: the wave stays inside the stage and leaves the page theme alone.
	let scope = $state<HTMLElement | null>(null);
	let day = $state(false);
</script>

<div
	bind:this={scope}
	class="relative flex h-full w-full items-center justify-between gap-6 overflow-hidden px-8 {day
		? 'bg-[#fbf6ec] text-[#201c16]'
		: 'bg-[#0d0c12] text-[#efeae2]'}"
>
	<div class="min-w-0">
		<p class="font-mono text-[10px] tracking-[0.2em] uppercase opacity-55">
			{day ? "Day reading" : "Night reading"}
		</p>
		<h3 class="mt-1.5 text-xl leading-tight font-semibold tracking-tight">
			Tide tables,<br />annotated
		</h3>
		<p class="mt-2 text-xs opacity-60">Press the sun to switch.</p>
	</div>
	<SunSwitch
		bind:checked={day}
		mode="contained"
		{scope}
		radius={values.radius as number}
		lensRadius={Math.max(3, Math.round((values.radius as number) * 0.66))}
		duration={values.duration as number}
		haloCells={values.haloCells as number}
		horizon={values.horizon !== false}
		label="Day reading"
		class="shrink-0"
		data-capture="click"
		data-capture-wait="300"
	/>
</div>
