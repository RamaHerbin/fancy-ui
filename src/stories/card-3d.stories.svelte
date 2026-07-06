<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { CardContainer, CardBody, CardItem } from "$lib/fancy-ui/card-3d";

	const { Story } = defineMeta({
		title: "Cards/Card3D",
		component: CardContainer,
		tags: ["autodocs"],
		argTypes: {
			containerClass: {
				control: "text",
				description: "CSS classes for the outer perspective wrapper",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<CardContainer {...args}>
		<CardBody
			class="group/card relative h-auto w-auto rounded-xl border border-black/[0.1] bg-gray-50 p-6 sm:w-[30rem] dark:border-white/[0.2] dark:bg-black"
		>
			<CardItem translateZ={50} class="text-xl font-bold text-neutral-600 dark:text-white">
				Make things float in 3D
			</CardItem>
			<CardItem
				as="p"
				translateZ={60}
				class="mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-300"
			>
				Hover over this card to see the 3D depth effect. Each element can have its own translateZ
				value.
			</CardItem>
			<CardItem translateZ={100} class="mt-4 w-full">
				<img
					src="https://picsum.photos/seed/forest/600/300"
					alt="Landscape"
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
{/snippet}

<Story name="Default" {template} />

{#snippet highDepth(args: any)}
	<CardContainer {...args}>
		<CardBody
			class="relative h-auto w-auto rounded-xl border border-white/[0.2] bg-black p-6 sm:w-[24rem]"
		>
			<CardItem translateZ={120} class="text-2xl font-bold text-white">Deep pop</CardItem>
			<CardItem as="p" translateZ={80} class="mt-2 max-w-sm text-sm text-neutral-300">
				A much higher translateZ makes elements leap further off the surface on hover.
			</CardItem>
		</CardBody>
	</CardContainer>
{/snippet}

<Story name="High Depth" template={highDepth} />
