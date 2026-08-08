<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Breadcrumb } from "$lib/fancy-ui/breadcrumb";
	import type { BreadcrumbItem } from "$lib/fancy-ui/breadcrumb";

	const BASIC_ITEMS: BreadcrumbItem[] = [
		{ label: "Docs", href: "/docs" },
		{ label: "Core", href: "/docs/core" },
		{ label: "Button" },
	];

	const LONG_ITEMS: BreadcrumbItem[] = [
		{ label: "Docs", href: "/docs" },
		{ label: "Core", href: "/docs/core" },
		{ label: "Navigation", href: "/docs/core/navigation" },
		{ label: "Components", href: "/docs/core/navigation/components" },
		{ label: "Button" },
	];

	const { Story } = defineMeta({
		title: "Navigation/Breadcrumb",
		component: Breadcrumb,
		tags: ["autodocs"],
		args: {
			items: BASIC_ITEMS,
			maxItems: 0,
			itemsBeforeCollapse: 1,
			itemsAfterCollapse: 1,
			separator: "/",
			label: "Breadcrumb",
		},
		argTypes: {
			maxItems: {
				control: "number",
				description:
					"Collapse the trail once it holds more than this many items. 0 never collapses",
			},
			itemsBeforeCollapse: {
				control: "number",
				description: "How many leading items stay visible once collapsed",
			},
			itemsAfterCollapse: {
				control: "number",
				description: "How many trailing items stay visible once collapsed",
			},
			separator: { control: "text", description: "Separator glyph rendered between crumbs" },
			label: { control: "text", description: "Accessible name for the nav" },
		},
	});
</script>

{#snippet template(args: any)}
	<Breadcrumb {...args} />
{/snippet}

<Story name="Default" {template} />

<Story name="Truncated" {template} args={{ items: LONG_ITEMS, maxItems: 3 }} />

<Story name="Custom separator" {template} args={{ separator: ">" }} />
