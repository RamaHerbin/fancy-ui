<script lang="ts">
	import { InteractiveHoverButton } from "$lib/fancy-ui/interactive-hover-button";
</script>

<div class="flex items-center gap-4">
	<InteractiveHoverButton
		text="Danger"
		class="border-red-500/30 [&_div>.size-2]:bg-red-500 [&>div:last-child]:text-white"
	/>
	<InteractiveHoverButton
		text="Success"
		class="border-green-500/30 [&_div>.size-2]:bg-green-500 [&>div:last-child]:text-white"
	/>
</div>
