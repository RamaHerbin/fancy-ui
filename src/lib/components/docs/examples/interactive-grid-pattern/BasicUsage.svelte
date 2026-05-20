<script lang="ts">
	import { InteractiveGridPattern } from "$lib/fancy-ui/interactive-grid-pattern";
</script>

<div class="relative flex h-96 w-full items-center justify-center overflow-hidden rounded-lg border bg-neutral-950">
	<InteractiveGridPattern class="[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]" />
	<p class="z-10 text-lg font-medium text-neutral-400">Hover over the grid</p>
</div>
