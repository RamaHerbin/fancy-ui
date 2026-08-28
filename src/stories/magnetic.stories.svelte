<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Magnetic } from "$lib/fancy-ui/magnetic";
	import { Button } from "$lib/fancy-ui/button";

	const { Story } = defineMeta({
		title: "Effects/Magnetic",
		component: Magnetic,
		tags: ["autodocs"],
		args: {
			strength: 0.35,
			radius: 40,
			max: 24,
			disabled: false,
		},
		argTypes: {
			strength: {
				control: { type: "number", min: 0, max: 1, step: 0.05 },
				description: "Pull multiplier applied to the pointer's offset from the child's center",
			},
			radius: {
				control: { type: "number", min: 0, max: 120, step: 4 },
				description: "Pixels the activation field extends beyond the element's own box",
			},
			max: {
				control: { type: "number", min: 0, max: 24, step: 2 },
				description:
					"Per-axis clamp (px) on the translated offset — 24 is the collection's travel ceiling",
			},
			disabled: { control: "boolean", description: "Disables the pull entirely" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex min-h-[240px] items-center justify-center p-10">
		<Magnetic {...args}>
			<Button variant="outline" size="lg">Hover me</Button>
		</Magnetic>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Strong pull" {template} args={{ strength: 0.55 }} />

<Story name="Large radius" {template} args={{ radius: 80 }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

{#snippet iconLink(args: any)}
	<div class="flex min-h-[240px] items-center justify-center p-10">
		<Magnetic {...args}>
			<a
				href="#demo"
				class="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
			>
				Learn more →
			</a>
		</Magnetic>
	</div>
{/snippet}

<Story name="Wrapping a link" template={iconLink} />
