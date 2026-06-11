<script lang="ts">
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">Blue → Purple</p>
		<GlowBorder color={["#3b82f6", "#8b5cf6"]} />
	</div>
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">Rainbow</p>
		<GlowBorder color={["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#8b00ff"]} />
	</div>
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">Sunset</p>
		<GlowBorder color={["#f97316", "#ec4899", "#8b5cf6"]} />
	</div>
</div>
