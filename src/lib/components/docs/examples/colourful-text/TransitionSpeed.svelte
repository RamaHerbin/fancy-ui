<script lang="ts">
	import { ColourfulText } from "$lib/fancy-ui/colourful-text";
</script>

<div class="space-y-6">
	<div class="text-center">
		<p class="text-muted-foreground mb-2 text-xs">Fast (0.2s)</p>
		<h2 class="text-3xl font-bold">
			<ColourfulText text="Lightning" duration={0.2} />
		</h2>
	</div>
	<div class="text-center">
		<p class="text-muted-foreground mb-2 text-xs">Slow (1.5s)</p>
		<h2 class="text-3xl font-bold">
			<ColourfulText text="Smooth Flow" duration={1.5} />
		</h2>
	</div>
</div>
