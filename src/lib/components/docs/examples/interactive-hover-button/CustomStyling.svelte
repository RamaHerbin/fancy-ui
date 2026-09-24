<script lang="ts">
	import { InteractiveHoverButton } from "$lib/fancy-ui/interactive-hover-button";
</script>

<div class="flex items-center gap-4">
	<InteractiveHoverButton
		sound
		text="Danger"
		class="border-red-500/30 [--ihb-fill-foreground:#fff] [--ihb-fill:#ef4444]"
	/>
	<InteractiveHoverButton
		sound
		text="Success"
		class="border-green-500/30 [--ihb-fill-foreground:#fff] [--ihb-fill:#22c55e]"
	/>
</div>
