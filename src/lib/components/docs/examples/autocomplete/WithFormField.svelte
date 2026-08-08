<script lang="ts">
	// FormField supplies controlId, aria-describedby and aria-invalid to
	// Autocomplete through context — no id or invalid prop needed here.
	import { FormField } from "$lib/fancy-ui/form-field";
	import { Autocomplete } from "$lib/fancy-ui/autocomplete";

	const cities = ["Paris", "Parma", "Prague", "London", "Lisbon", "Lyon"];
	let city = $state("");
</script>

<FormField
	label="City"
	required
	error={city ? undefined : "Enter a city before continuing."}
	class="w-full max-w-sm"
>
	<Autocomplete suggestions={cities} bind:value={city} />
</FormField>
