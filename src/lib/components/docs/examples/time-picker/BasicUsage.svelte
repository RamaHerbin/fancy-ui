<script lang="ts">
	import { TimePicker } from "$lib/fancy-ui/time-picker";

	let time = $state<string | null>(null);
</script>

<TimePicker sound bind:value={time} label="Time" />
