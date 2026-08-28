<script lang="ts">
	import { Skeleton } from "$lib/fancy-ui/skeleton";
	import { Button } from "$lib/fancy-ui/button";

	let loading = $state(true);
</script>

<div class="flex w-full max-w-sm flex-col items-start gap-4 p-6">
	<!-- Wrapping mode: `children` is always supplied, so Skeleton itself decides
	     what to show — bones + aria-busy while loading, the real content once it
	     isn't. No `{#if}` needed around the swap; that's the whole point of this
	     mode over the standalone one used in BasicUsage. -->
	<Skeleton {loading} variant="text" lines={2} class="w-full">
		<p class="text-foreground text-sm">
			Your invoice for August is ready — total due <strong>$128.40</strong>, payable by the 30th.
		</p>
	</Skeleton>

	<Button size="sm" variant="outline" onclick={() => (loading = !loading)}>
		{loading ? "Show content" : "Show loading"}
	</Button>
</div>
