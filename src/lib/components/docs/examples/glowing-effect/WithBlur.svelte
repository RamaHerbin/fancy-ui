<script lang="ts">
	import { GlowingEffect } from "$lib/fancy-ui/glowing-effect";
</script>

<div class="bg-card relative max-w-md rounded-xl border p-8">
	<GlowingEffect spread={60} glow blur={6} proximity={100} disabled={false} />
	<h3 class="mb-2 text-lg font-semibold">Blurred glow</h3>
	<p class="text-muted-foreground">Wider spread and blur for a softer effect.</p>
</div>
