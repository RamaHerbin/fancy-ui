<script lang="ts">
	import { InteractiveGridPattern } from "$lib/fancy-ui/interactive-grid-pattern";
</script>

<div
	class="relative flex h-96 w-full items-center justify-center overflow-hidden rounded-lg border bg-white"
>
	<InteractiveGridPattern interactive={false} strokeClassName="stroke-black/40" />
	<p class="z-10 text-lg font-medium text-black">Static graph paper — no hover listeners</p>
</div>
