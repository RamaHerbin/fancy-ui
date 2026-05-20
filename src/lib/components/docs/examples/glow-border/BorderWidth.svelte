<script lang="ts">
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">1px</p>
		<GlowBorder borderWidth={1} color="#00ffff" />
	</div>
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">3px</p>
		<GlowBorder borderWidth={3} color="#00ffff" />
	</div>
	<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
		<p class="text-muted-foreground text-center text-xs">5px</p>
		<GlowBorder borderWidth={5} color="#00ffff" />
	</div>
</div>
