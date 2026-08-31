<script lang="ts">
	import { NumberInput } from "$lib/fancy-ui/number-input";

	let seats = $state<number | null>(2);
</script>

<NumberInput sound bind:value={seats} min={1} max={8} label="Seats" />
