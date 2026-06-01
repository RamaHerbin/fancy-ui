<script lang="ts">
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
</script>

<div class="bg-card relative max-w-sm rounded-2xl border p-6">
	<GlowBorder borderRadius={16} color={["#3b82f6", "#8b5cf6", "#ec4899"]} borderWidth={2} />
	<h3 class="mb-2 text-lg font-semibold">Premium Feature</h3>
	<p class="text-muted-foreground mb-4 text-sm">
		This card has a beautiful animated glow border that draws attention.
	</p>
	<button
		class="bg-primary text-primary-foreground w-full rounded-lg px-4 py-2 text-sm font-medium"
	>
		Get Started
	</button>
</div>
