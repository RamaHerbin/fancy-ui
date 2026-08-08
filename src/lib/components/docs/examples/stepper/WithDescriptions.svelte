<script lang="ts">
	import { Stepper, Step } from "$lib/fancy-ui/stepper";

	let current = $state(1);
</script>

<Stepper bind:current orientation="vertical" class="max-w-sm">
	<Step label="Account" description="Create your login" />
	<Step label="Profile" description="Tell us about yourself" />
	<Step label="Confirmation" description="Review and finish" />
</Stepper>
