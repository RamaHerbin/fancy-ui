<script lang="ts">
	import { CardContainer, CardBody, CardItem } from "$lib/fancy-ui/card-3d";
</script>

<CardContainer class="inter-var">
	<CardBody class="group/card relative h-auto w-auto rounded-xl border border-black/[0.1] bg-gray-50 p-6 sm:w-[30rem] dark:border-white/[0.2] dark:bg-black dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]">
		<CardItem translateZ={50} class="text-xl font-bold text-neutral-600 dark:text-white">
			Make things float in 3D
		</CardItem>
		<CardItem as="p" translateZ={60} class="mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-300">
			Hover over this card to see the 3D depth effect. Each element can have its own translateZ value.
		</CardItem>
		<CardItem translateZ={100} class="mt-4 w-full">
			<img
				src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop"
				alt="Forest landscape"
				class="h-60 w-full rounded-xl object-cover group-hover/card:shadow-xl"
			/>
		</CardItem>
		<div class="mt-6 flex items-center justify-between">
			<CardItem translateZ={20} as="a" class="rounded-xl px-4 py-2 text-xs font-normal dark:text-white">
				Try now &rarr;
			</CardItem>
			<CardItem translateZ={20} as="button" class="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-black">
				Sign up
			</CardItem>
		</div>
	</CardBody>
</CardContainer>
