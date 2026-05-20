<script lang="ts">
	import { InteractiveGridPattern } from "$lib/fancy-ui/interactive-grid-pattern";
</script>

<div class="relative flex h-96 w-full items-center justify-center overflow-hidden rounded-lg border bg-neutral-950">
	<InteractiveGridPattern
		width={30}
		height={30}
		squares={[30, 20]}
		squaresClassName="hover:fill-blue-500/30"
		class="[mask-image:radial-gradient(350px_circle_at_center,white,transparent)]"
	/>
	<p class="z-10 text-lg font-medium text-neutral-400">Blue hover effect</p>
</div>
