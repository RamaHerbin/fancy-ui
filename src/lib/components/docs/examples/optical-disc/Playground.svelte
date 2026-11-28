<script lang="ts">
	import { OpticalDisc } from "$lib/fancy-ui/optical-disc";

	let spin = $state(9);
	let tilt = $state(14);
	let iridescence = $state(1);
	let pitch = $state(1600);
	let interactive = $state(true);
</script>

<div class="flex w-full flex-col items-center gap-6 md:flex-row md:items-start">
	<div class="flex flex-1 items-center justify-center rounded-xl bg-neutral-900 p-8">
		<OpticalDisc
			alt="A disc you can tune"
			{spin}
			{tilt}
			{iridescence}
			{pitch}
			{interactive}
			class="max-w-xs"
		/>
	</div>

	<div class="text-foreground flex w-full flex-col gap-4 text-sm md:w-64">
		<label class="flex flex-col gap-1">
			<span>Seconds per turn: {spin}</span>
			<input type="range" min="-20" max="20" step="1" bind:value={spin} />
		</label>
		<label class="flex flex-col gap-1">
			<span>Tilt: {tilt}°</span>
			<input type="range" min="-40" max="40" step="1" bind:value={tilt} />
		</label>
		<label class="flex flex-col gap-1">
			<span>Iridescence: {iridescence.toFixed(1)}</span>
			<input type="range" min="0" max="2" step="0.1" bind:value={iridescence} />
		</label>
		<label class="flex flex-col gap-1">
			<span>Track pitch: {pitch} nm</span>
			<input type="range" min="600" max="3000" step="20" bind:value={pitch} />
		</label>
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={interactive} />
			<span>Drag to turn</span>
		</label>
	</div>
</div>
