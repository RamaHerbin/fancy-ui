<script lang="ts">
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerDuration="1.5s">Fast (1.5s)</ShimmerButton>
		<span class="text-muted-foreground text-xs">shimmerDuration="1.5s"</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerDuration="3s">Default (3s)</ShimmerButton>
		<span class="text-muted-foreground text-xs">shimmerDuration="3s"</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerDuration="6s">Slow (6s)</ShimmerButton>
		<span class="text-muted-foreground text-xs">shimmerDuration="6s"</span>
	</div>
</div>
