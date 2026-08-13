<script lang="ts">
	import { Autocomplete } from "$lib/fancy-ui/autocomplete";

	const cities = ["Paris", "Parma", "Prague", "London", "Lisbon", "Lyon"];
	let city = $state("");
</script>

<Autocomplete suggestions={cities} bind:value={city} label="City" placeholder="Type a city…" />
