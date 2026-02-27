<script lang="ts">
	import { CardSpotlight } from "$lib/fancy-ui/card-spotlight";
</script>

<svelte:head>
	<title>Card Spotlight - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Card Spotlight</h1>
	<p class="text-muted-foreground mb-8">
		Card with a mouse-following spotlight gradient effect on hover.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<CardSpotlight class="h-64 w-80">
				<div class="p-6">
					<h3 class="text-lg font-bold">Spotlight Card</h3>
					<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
						Hover to see the spotlight effect following your cursor.
					</p>
				</div>
			</CardSpotlight>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Gradient Colors</h2>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<CardSpotlight class="h-64 w-72" gradientColor="#3b82f6" gradientSize={250}>
				<div class="p-6">
					<h3 class="text-lg font-bold">Blue Spotlight</h3>
					<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
						Custom blue gradient color.
					</p>
				</div>
			</CardSpotlight>

			<CardSpotlight class="h-64 w-72" gradientColor="#10b981" gradientSize={300}>
				<div class="p-6">
					<h3 class="text-lg font-bold">Green Spotlight</h3>
					<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
						Custom green gradient with larger radius.
					</p>
				</div>
			</CardSpotlight>

			<CardSpotlight class="h-64 w-72" gradientColor="#f59e0b" gradientOpacity={0.6}>
				<div class="p-6">
					<h3 class="text-lg font-bold">Amber Spotlight</h3>
					<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
						Lower opacity for a subtler effect.
					</p>
				</div>
			</CardSpotlight>
		</div>
	</section>
</div>
