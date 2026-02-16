<script lang="ts">
	import CarbonNeutralBadge from '$lib/portfolio/CarbonNeutralBadge.svelte';
</script>

<footer
	class="w-full border-t border-border/40 py-8 text-center text-sm text-muted-foreground bg-background"
>
	<div class="space-y-3">
		<p class="text-muted-foreground/80">
			&copy; {new Date().getFullYear()} Rama Herbin. All rights reserved.
		</p>
		<CarbonNeutralBadge />
	</div>
</footer>
