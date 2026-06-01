<script lang="ts">
	import { CardContainer, CardBody, CardItem } from "$lib/fancy-ui/card-3d";
</script>

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
