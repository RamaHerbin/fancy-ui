<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuLabel,
		DropdownMenuSub,
		DropdownMenuSubTrigger,
		DropdownMenuSubContent,
	} from "$lib/fancy-ui/dropdown-menu";

	const { Story } = defineMeta({
		title: "Core/DropdownMenu",
		component: DropdownMenu,
		tags: ["autodocs"],
		args: {
			side: "bottom",
			align: "start",
			offset: 4,
			loop: true,
		},
		argTypes: {
			side: {
				control: "select",
				options: ["top", "right", "bottom", "left"],
				description: "Side of the trigger to place the menu on",
			},
			align: {
				control: "select",
				options: ["start", "center", "end"],
				description: "Alignment along the trigger's cross axis",
			},
			offset: { control: "number", description: "Gap in pixels between the trigger and the menu" },
			loop: { control: "boolean", description: "Whether arrow-key navigation wraps at the ends" },
		},
	});
</script>

{#snippet template(args: any)}
	<DropdownMenu {...args}>
		<DropdownMenuTrigger>Options</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuLabel>Actions</DropdownMenuLabel>
			<DropdownMenuItem shortcut="⌘R">Rename</DropdownMenuItem>
			<DropdownMenuItem shortcut="⌘D">Duplicate</DropdownMenuItem>
			<DropdownMenuItem>Share…</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem variant="destructive" shortcut="⌫">Delete</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
{/snippet}

{#snippet submenuTemplate(args: any)}
	<DropdownMenu {...args}>
		<DropdownMenuTrigger>Actions</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuItem>Reload</DropdownMenuItem>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>More tools</DropdownMenuSubTrigger>
				<DropdownMenuSubContent>
					<DropdownMenuItem>Screenshot</DropdownMenuItem>
					<DropdownMenuItem>Inspect</DropdownMenuItem>
				</DropdownMenuSubContent>
			</DropdownMenuSub>
			<DropdownMenuSeparator />
			<DropdownMenuItem>Save page…</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
{/snippet}

{#snippet disabledTemplate(args: any)}
	<DropdownMenu {...args}>
		<DropdownMenuTrigger>Edit</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuItem>Undo</DropdownMenuItem>
			<DropdownMenuItem disabled>Redo</DropdownMenuItem>
			<DropdownMenuItem>Cut</DropdownMenuItem>
			<DropdownMenuItem disabled>Paste</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
{/snippet}

<Story name="Default" {template} />

<Story name="With Submenu" template={submenuTemplate} />

<Story name="Disabled Items" template={disabledTemplate} />

<Story name="Right, start-aligned" {template} args={{ side: "right", align: "start" }} />

<Story name="No Loop" {template} args={{ loop: false }} />
