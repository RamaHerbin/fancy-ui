<script lang="ts">
	import { NumberInput } from "$lib/fancy-ui/number-input";

	let opacity = $state<number | null>(0.5);
</script>

<NumberInput sound bind:value={opacity} min={0} max={1} step={0.1} label="Opacity" />
