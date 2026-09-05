<script lang="ts">
	import { Slider } from "$lib/fancy-ui/slider";
	import { NumberInput } from "$lib/fancy-ui/number-input";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";

	let volume = $state(60);
	let copies = $state<number | null>(2);
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<SoundToggle size="sm" showLabel label="Sound for the stepped controls" />
		<span class="text-muted-foreground text-sm">
			Turn sound on, then drag the slider or step the number.
		</span>
	</div>

	<!-- One tick per committed value — on drag release, a keyboard step, or a
	     stepper press — never one per pixel of a drag. -->
	<div class="flex w-full max-w-md flex-col gap-6">
		<Slider sound bind:value={volume} label="Volume" showValue />
		<NumberInput sound bind:value={copies} label="Copies" min={1} max={10} class="w-40" />
	</div>
</div>
