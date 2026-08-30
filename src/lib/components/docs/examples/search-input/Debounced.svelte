<script lang="ts">
	import { SearchInput } from "$lib/fancy-ui/search-input";

	let query = $state("");
	let lastSearch = $state("");
</script>

<div class="flex w-full max-w-sm flex-col gap-2">
	<SearchInput
		sound
		bind:value={query}
		placeholder="Type to filter…"
		debounceMs={300}
		onSearch={(v) => (lastSearch = v)}
	/>
	<p class="text-muted-foreground text-[12px]">
		Last search: {lastSearch || "—"}
	</p>
</div>
