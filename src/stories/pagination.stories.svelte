<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Pagination } from "$lib/fancy-ui/pagination";

	const { Story } = defineMeta({
		title: "Navigation/Pagination",
		component: Pagination,
		tags: ["autodocs"],
		args: {
			page: 1,
			count: 12,
			siblingCount: 1,
			boundaryCount: 1,
			showEdges: false,
			disabled: false,
			label: "Pagination",
		},
		argTypes: {
			page: { control: "number", description: "Current page, 1-based. Bindable" },
			count: { control: "number", description: "Total number of pages" },
			siblingCount: {
				control: "number",
				description: "Pages shown on each side of the current page",
			},
			boundaryCount: {
				control: "number",
				description: "Pages always shown at each end of the run",
			},
			showEdges: { control: "boolean", description: "Shows First/Last jump buttons" },
			disabled: { control: "boolean", description: "Disables every control" },
			label: { control: "text", description: "Accessible name for the nav landmark" },
		},
	});
</script>

{#snippet template(args: any)}
	<Pagination {...args} />
{/snippet}

<Story name="Default" {template} />

<Story name="First page" {template} args={{ page: 1, count: 12 }} />

<Story name="Last page" {template} args={{ page: 12, count: 12 }} />

<Story name="Middle of a long run" {template} args={{ page: 20, count: 40 }} />

<Story name="With First/Last" {template} args={{ page: 6, count: 30, showEdges: true }} />

<Story name="Wider sibling window" {template} args={{ page: 10, count: 40, siblingCount: 2 }} />

<Story name="Disabled" {template} args={{ page: 4, count: 12, disabled: true }} />
