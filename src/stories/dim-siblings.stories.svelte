<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { DimSiblings } from "$lib/fancy-ui/dim-siblings";

	const { Story } = defineMeta({
		title: "Effects/DimSiblings",
		component: DimSiblings,
		tags: ["autodocs"],
		args: {
			effect: "dim",
			opacity: 0.4,
			blur: 2,
			duration: 150,
		},
		argTypes: {
			effect: {
				control: "select",
				options: ["dim", "blur", "both"],
				description: "Which visual property the non-active siblings lose",
			},
			opacity: {
				control: { type: "number", min: 0, max: 1, step: 0.05 },
				description: "Opacity the non-active siblings settle to",
			},
			blur: {
				control: { type: "number", min: 0, max: 20, step: 1 },
				description: "Blur radius in px, applied only when effect includes blur",
			},
			duration: {
				control: { type: "number", min: 0, max: 600, step: 50 },
				description: "Transition duration in ms",
			},
			as: {
				control: "text",
				description: 'The rendered root element, e.g. "ul" for a list of cards',
			},
		},
	});
</script>

{#snippet template(args: any)}
	<DimSiblings {...args} class="grid grid-cols-2 gap-6 p-10 sm:grid-cols-4">
		<a href="#product" class="text-muted-foreground hover:text-foreground text-sm">Product</a>
		<a href="#docs" class="text-muted-foreground hover:text-foreground text-sm">Docs</a>
		<a href="#pricing" class="text-muted-foreground hover:text-foreground text-sm">Pricing</a>
		<a href="#blog" class="text-muted-foreground hover:text-foreground text-sm">Blog</a>
	</DimSiblings>
{/snippet}

<Story name="Default" {template} />

<Story name="Blur" {template} args={{ effect: "blur" }} />

<Story name="Both" {template} args={{ effect: "both" }} />

<Story name="Lower opacity" {template} args={{ opacity: 0.15 }} />

{#snippet list(args: any)}
	<DimSiblings {...args} as="ul" class="grid grid-cols-1 gap-4 p-10 sm:grid-cols-3">
		<li class="border-border bg-card rounded-xl border p-4">
			<p class="text-foreground text-sm font-semibold">Starter</p>
			<p class="text-muted-foreground mt-1 text-sm">For solo projects.</p>
		</li>
		<li class="border-border bg-card rounded-xl border p-4">
			<p class="text-foreground text-sm font-semibold">Team</p>
			<p class="text-muted-foreground mt-1 text-sm">For small teams.</p>
		</li>
		<li class="border-border bg-card rounded-xl border p-4">
			<p class="text-foreground text-sm font-semibold">Scale</p>
			<p class="text-muted-foreground mt-1 text-sm">For growing products.</p>
		</li>
	</DimSiblings>
{/snippet}

<Story name="As a list" template={list} args={{ effect: "both" }} />
