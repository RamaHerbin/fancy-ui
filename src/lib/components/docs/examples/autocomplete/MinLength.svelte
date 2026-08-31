<script lang="ts">
	// Suggestions stay hidden until the third character — useful for a long
	// candidate list where a one- or two-letter query would match too much
	// to be a useful shortcut.
	import { Autocomplete } from "$lib/fancy-ui/autocomplete";

	const cities = ["Paris", "Parma", "Prague", "London", "Lisbon", "Lyon"];
	let city = $state("");
</script>

<Autocomplete
	sound
	suggestions={cities}
	bind:value={city}
	minLength={3}
	label="City (3+ characters)"
	placeholder="Type at least 3 characters…"
/>
