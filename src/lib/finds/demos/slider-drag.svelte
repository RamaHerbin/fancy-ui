<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { Slider } from "$lib/fancy-ui/slider";

	let { values }: { values: PlaygroundValues } = $props();

	let value = $state(60);
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<div class="w-56">
		<Slider
			bind:value
			step={Number(values.step)}
			showValue={values.showValue as boolean}
			sound={values.sound as boolean}
			label="Volume"
		/>
	</div>
</div>
