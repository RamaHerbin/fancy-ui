<script lang="ts">
	import { CardContainer, CardBody, CardItem } from "$lib/fancy-ui/card-3d";
</script>

<svelte:head>
	<title>Card 3D - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Card 3D</h1>
	<p class="text-muted-foreground mb-8">
		Interactive 3D perspective card that follows mouse movement with depth effects on child
		elements.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<CardContainer class="inter-var">
				<CardBody
					class="group/card relative h-auto w-auto rounded-xl border border-black/[0.1] bg-gray-50 p-6 sm:w-[30rem] dark:border-white/[0.2] dark:bg-black dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]"
				>
					<CardItem translateZ={50} class="text-xl font-bold text-neutral-600 dark:text-white">
						Make things float in 3D
					</CardItem>
					<CardItem
						as="p"
						translateZ={60}
						class="mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-300"
					>
						Hover over this card to see the 3D depth effect. Each element can have its own
						translateZ value.
					</CardItem>
					<CardItem translateZ={100} class="mt-4 w-full">
						<img
							src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop"
							alt="Forest landscape"
							class="h-60 w-full rounded-xl object-cover group-hover/card:shadow-xl"
						/>
					</CardItem>
					<div class="mt-6 flex items-center justify-between">
						<CardItem
							translateZ={20}
							as="a"
							class="rounded-xl px-4 py-2 text-xs font-normal dark:text-white"
						>
							Try now &rarr;
						</CardItem>
						<CardItem
							translateZ={20}
							as="button"
							class="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-black"
						>
							Sign up
						</CardItem>
					</div>
				</CardBody>
			</CardContainer>
		</div>
	</section>

	<!-- Elevated Items -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">High Depth Values</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<CardContainer>
				<CardBody
					class="relative h-auto w-auto rounded-xl border border-black/[0.1] bg-gray-50 p-6 sm:w-[20rem] dark:border-white/[0.2] dark:bg-black"
				>
					<CardItem translateZ={100} class="text-lg font-bold text-neutral-600 dark:text-white">
						I float higher
					</CardItem>
					<CardItem translateZ={40} class="mt-2 text-sm text-neutral-500 dark:text-neutral-300">
						translateZ = 40
					</CardItem>
					<CardItem
						translateZ={150}
						rotateZ={5}
						class="mt-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-8 text-center font-semibold text-white"
					>
						translateZ = 150, rotateZ = 5
					</CardItem>
				</CardBody>
			</CardContainer>
		</div>
	</section>
</div>
