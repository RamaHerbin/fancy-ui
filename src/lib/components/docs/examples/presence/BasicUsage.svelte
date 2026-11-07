<script lang="ts">
	import { Presence } from "$lib/fancy-ui/presence";
	import { Checkbox } from "$lib/fancy-ui/checkbox";
	import { Button } from "$lib/fancy-ui/button";

	let agreed = $state(false);
	// Remounting (via {#key}) puts the demo back in its first state, so the
	// enter motion plays again from scratch.
	let replayKey = $state(0);
</script>

<div class="flex w-full flex-col gap-4 p-6">
	<div class="flex justify-end">
		<Button
			variant="outline"
			size="sm"
			onclick={() => {
				agreed = false;
				replayKey++;
			}}>Replay</Button
		>
	</div>

	{#key replayKey}
		<div class="flex flex-col gap-2">
			<Checkbox bind:checked={agreed}>I agree to the terms and conditions</Checkbox>

			<Presence open={!agreed} duration={200} exitDuration={150}>
				<p class="text-destructive text-sm">You must agree before continuing.</p>
			</Presence>
		</div>
	{/key}
</div>
