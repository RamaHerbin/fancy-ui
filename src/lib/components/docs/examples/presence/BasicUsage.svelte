<script lang="ts">
	import { Presence } from "$lib/fancy-ui/presence";
	import { Checkbox } from "$lib/fancy-ui/checkbox";

	let agreed = $state(false);
</script>

<div class="flex w-full flex-col gap-2 p-6">
	<Checkbox bind:checked={agreed}>I agree to the terms and conditions</Checkbox>

	<Presence open={!agreed} duration={200} exitDuration={150}>
		<p class="text-destructive text-sm">You must agree before continuing.</p>
	</Presence>
</div>
