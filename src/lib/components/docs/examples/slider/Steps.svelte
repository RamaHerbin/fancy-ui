<script lang="ts">
	import { Slider } from "$lib/fancy-ui/slider";

	let rating = $state(3);
</script>

<div class="w-72">
	<Slider bind:value={rating} min={0} max={5} step={1} label="Rating" showValue showBounds />
</div>
