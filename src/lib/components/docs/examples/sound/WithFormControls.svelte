<script lang="ts">
	import { Checkbox } from "$lib/fancy-ui/checkbox";
	import { Switch } from "$lib/fancy-ui/switch";
	import { RadioGroup, RadioGroupItem } from "$lib/fancy-ui/radio-group";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";

	let agreed = $state(false);
	let notifications = $state(true);
	let plan = $state("pro");
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<SoundToggle size="sm" showLabel label="Sound for the form controls" />
		<span class="text-muted-foreground text-sm">
			Turn sound on, then check the box, flip the switch, or pick a plan below.
		</span>
	</div>

	<div class="flex flex-col gap-4">
		<Checkbox sound bind:checked={agreed}>I agree to the terms</Checkbox>
		<Switch sound bind:checked={notifications} label="Enable notifications" />
		<RadioGroup sound bind:value={plan} label="Plan" orientation="horizontal">
			<RadioGroupItem value="free" label="Free" />
			<RadioGroupItem value="pro" label="Pro" />
			<RadioGroupItem value="team" label="Team" />
		</RadioGroup>
	</div>
</div>
