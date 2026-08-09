<script lang="ts">
	import { Slider } from "$lib/fancy-ui/slider";

	let brightness = $state(40);
</script>

<div class="w-72">
	<Slider bind:value={brightness} min={0} max={100} label="Brightness" showValue showBounds />
</div>
