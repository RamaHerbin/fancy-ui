<script lang="ts">
	import { RadioGroup, RadioGroupItem } from "$lib/fancy-ui/radio-group";

	let size = $state("md");
</script>

<RadioGroup sound bind:value={size} orientation="horizontal" label="Size">
	<RadioGroupItem value="sm" label="Small" />
	<RadioGroupItem value="md" label="Medium" />
	<RadioGroupItem value="lg" label="Large" />
</RadioGroup>
