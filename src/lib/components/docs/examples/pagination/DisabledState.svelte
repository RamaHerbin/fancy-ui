<script lang="ts">
	import { Pagination } from "$lib/fancy-ui/pagination";

	let page = $state(4);
</script>

<Pagination bind:page count={12} disabled />
