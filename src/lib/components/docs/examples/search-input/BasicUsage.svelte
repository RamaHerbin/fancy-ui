<script lang="ts">
	import { SearchInput } from "$lib/fancy-ui/search-input";

	let query = $state("");
</script>

<SearchInput bind:value={query} placeholder="Search components" onSearch={(v) => console.log(v)} />
