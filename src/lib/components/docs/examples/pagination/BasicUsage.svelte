<script lang="ts">
	import { Pagination } from "$lib/fancy-ui/pagination";

	let page = $state(1);
</script>

<Pagination sound bind:page count={12} />
