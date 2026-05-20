<script lang="ts">
	import { GlowingEffect } from "$lib/fancy-ui/glowing-effect";
</script>

<div class="bg-card relative max-w-md rounded-xl border p-8">
	<GlowingEffect spread={40} glow disabled={false} />
	<h3 class="mb-2 text-lg font-semibold">Hover near me</h3>
	<p class="text-muted-foreground">Move your cursor near this card to see the glow effect.</p>
</div>
