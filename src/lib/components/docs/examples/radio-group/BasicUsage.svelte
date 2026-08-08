<script lang="ts">
	import { RadioGroup, RadioGroupItem } from "$lib/fancy-ui/radio-group";

	let plan = $state("a");
</script>

<RadioGroup bind:value={plan} label="Plan">
	<RadioGroupItem value="a" label="Option A" />
	<RadioGroupItem value="b" label="Option B" />
	<RadioGroupItem value="c" label="Option C" />
</RadioGroup>
