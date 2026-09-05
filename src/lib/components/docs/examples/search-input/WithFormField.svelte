<script lang="ts">
	// FormField ships from an earlier wave and supplies controlId,
	// aria-describedby and aria-invalid to SearchInput through context —
	// SearchInput itself needs no id or invalid prop here.
	import { FormField } from "$lib/fancy-ui/form-field";
	import { SearchInput } from "$lib/fancy-ui/search-input";

	let query = $state("");
</script>

<FormField label="Find a component" description="Matches by name or tag." class="w-full max-w-sm">
	<SearchInput sound bind:value={query} />
</FormField>
