<script lang="ts">
	import CarbonNeutralBadge from "$lib/portfolio/CarbonNeutralBadge.svelte";
</script>

<footer
	class="border-border/40 text-muted-foreground bg-background w-full border-t py-8 text-center text-sm"
>
	<div class="space-y-3">
		<p class="text-muted-foreground/80">
			&copy; {new Date().getFullYear()} Rama Herbin. All rights reserved.
		</p>
		<CarbonNeutralBadge />
	</div>
</footer>
