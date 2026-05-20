<script lang="ts">
	import { CardSpotlight } from "$lib/fancy-ui/card-spotlight";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<CardSpotlight class="h-64 w-72" gradientColor="#3b82f6" gradientSize={250}>
		<div class="p-6">
			<h3 class="text-lg font-bold">Blue Spotlight</h3>
			<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Custom blue gradient color.</p>
		</div>
	</CardSpotlight>
	<CardSpotlight class="h-64 w-72" gradientColor="#10b981" gradientSize={300}>
		<div class="p-6">
			<h3 class="text-lg font-bold">Green Spotlight</h3>
			<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Custom green gradient with larger radius.</p>
		</div>
	</CardSpotlight>
	<CardSpotlight class="h-64 w-72" gradientColor="#f59e0b" gradientOpacity={0.6}>
		<div class="p-6">
			<h3 class="text-lg font-bold">Amber Spotlight</h3>
			<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Lower opacity for a subtler effect.</p>
		</div>
	</CardSpotlight>
</div>
