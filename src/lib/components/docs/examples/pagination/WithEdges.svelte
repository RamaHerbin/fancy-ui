<script lang="ts">
	import { Pagination } from "$lib/fancy-ui/pagination";

	let page = $state(6);
</script>

<Pagination bind:page count={30} showEdges />
