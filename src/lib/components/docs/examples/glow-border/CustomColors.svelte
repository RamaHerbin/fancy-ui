<script lang="ts">
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">Cyan</p>
		<GlowBorder color="#00ffff" />
	</div>
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">Pink</p>
		<GlowBorder color="#ff00ff" />
	</div>
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">Gold</p>
		<GlowBorder color="#ffd700" />
	</div>
</div>
