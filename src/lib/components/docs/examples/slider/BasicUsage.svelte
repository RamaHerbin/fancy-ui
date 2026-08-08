<script lang="ts">
	import { Slider } from "$lib/fancy-ui/slider";

	let volume = $state(60);
</script>

<div class="w-72">
	<Slider bind:value={volume} label="Volume" showValue />
</div>
