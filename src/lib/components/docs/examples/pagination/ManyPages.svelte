<script lang="ts">
	import { Pagination } from "$lib/fancy-ui/pagination";

	let page = $state(1);
</script>

<div class="flex flex-col items-start gap-2">
	<Pagination sound bind:page count={200} />
	<p class="text-muted-foreground text-sm">
		A 200-page run: the sequence stays a handful of numbers plus two ellipses, wherever
		{page} lands.
	</p>
</div>
