<script lang="ts">
	import { DatePicker } from "$lib/fancy-ui/date-picker";

	let selected = $state<Date | null>(null);

	function isWeekend(date: Date): boolean {
		const day = date.getDay();
		return day === 0 || day === 6;
	}
</script>

<DatePicker
	sound
	bind:value={selected}
	isDateDisabled={isWeekend}
	label="Delivery date"
	placeholder="Weekdays only"
/>
