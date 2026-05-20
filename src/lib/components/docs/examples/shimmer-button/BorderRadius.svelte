<script lang="ts">
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton borderRadius="8px">Rounded</ShimmerButton>
		<span class="text-muted-foreground text-xs">8px</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton borderRadius="100px">Pill (default)</ShimmerButton>
		<span class="text-muted-foreground text-xs">100px</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton borderRadius="0px">Square</ShimmerButton>
		<span class="text-muted-foreground text-xs">0px</span>
	</div>
</div>
