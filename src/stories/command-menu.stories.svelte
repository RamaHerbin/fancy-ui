<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { CommandMenu, type CommandItem } from "$lib/fancy-ui/command-menu";

	const items: CommandItem[] = [
		{ id: "search", label: "Search everything" },
		{ id: "button", label: "Button", group: "Core", meta: "Actions" },
		{ id: "icon-button", label: "Icon Button", group: "Core", meta: "Actions" },
		{ id: "rainbow-button", label: "Rainbow Button", group: "Fancy", meta: "Buttons" },
		{
			id: "billing",
			label: "Billing",
			group: "Navigate",
			meta: "Settings",
			keywords: ["invoice", "plan"],
		},
		{ id: "profile", label: "Go to profile", group: "Navigate" },
		{ id: "archived", label: "Archived project", group: "Navigate", disabled: true },
	];

	const { Story } = defineMeta({
		title: "Navigation/CommandMenu",
		component: CommandMenu,
		tags: ["autodocs"],
		args: {
			open: true,
			items,
			placeholder: "Search...",
			emptyMessage: "No results",
			label: "Command menu",
		},
		argTypes: {
			open: { control: "boolean", description: "Whether the menu is open" },
			placeholder: { control: "text", description: "Placeholder for the search field" },
			emptyMessage: { control: "text", description: "Shown when nothing matches" },
			label: { control: "text", description: "Accessible name for the dialog and search field" },
		},
	});
</script>

{#snippet template(args: any)}
	<CommandMenu {...args} />
{/snippet}

<Story name="Default" {template} />

<Story name="Prefilled Query" {template} args={{ query: "but" }} />

<Story name="No Matches" {template} args={{ query: "zzz-no-match" }} />

<Story name="Empty Vocabulary" {template} args={{ items: [] }} />
