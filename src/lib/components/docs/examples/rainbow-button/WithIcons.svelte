<script lang="ts">
	import { RainbowButton } from "$lib/fancy-ui/rainbow-button";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import Sparkles from "@lucide/svelte/icons/sparkles";
</script>

<div class="flex flex-wrap gap-4">
	<RainbowButton>
		<Sparkles class="mr-2 h-4 w-4" />
		Magic Button
	</RainbowButton>
	<RainbowButton>
		Continue
		<ChevronRight class="ml-2 h-4 w-4" />
	</RainbowButton>
</div>
