<script lang="ts">
	import { TimePicker } from "$lib/fancy-ui/time-picker";

	let time = $state<string | null>(null);
</script>

<TimePicker
	sound
	bind:value={time}
	min="09:00"
	max="17:00"
	label="Meeting time"
	placeholder="Business hours only"
/>
