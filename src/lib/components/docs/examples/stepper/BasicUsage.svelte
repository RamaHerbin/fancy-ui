<script lang="ts">
	import { Stepper, Step } from "$lib/fancy-ui/stepper";

	let current = $state(1);
</script>

<Stepper bind:current>
	<Step label="Account" />
	<Step label="Profile" />
	<Step label="Confirmation" />
</Stepper>
