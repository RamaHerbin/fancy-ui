<script lang="ts">
	import { DatePicker } from "$lib/fancy-ui/date-picker";

	let selected = $state<Date | null>(null);

	const today = new Date();
	const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const max = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
</script>

<DatePicker
	bind:value={selected}
	{min}
	{max}
	label="Appointment date"
	placeholder="Within the next 30 days"
/>
