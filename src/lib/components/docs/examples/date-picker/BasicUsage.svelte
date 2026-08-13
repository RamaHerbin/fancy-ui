<script lang="ts">
	import { DatePicker } from "$lib/fancy-ui/date-picker";

	let selected = $state<Date | null>(null);
</script>

<DatePicker bind:value={selected} label="Date" />
