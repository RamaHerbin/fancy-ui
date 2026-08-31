<script lang="ts">
	import { NumberInput } from "$lib/fancy-ui/number-input";

	let quantity = $state<number | null>(12);
</script>

<NumberInput sound bind:value={quantity} label="Quantity" />
