<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import {
		ContextMenu,
		ContextMenuTrigger,
		ContextMenuContent,
		ContextMenuItem,
		ContextMenuSeparator,
		ContextMenuSub,
		ContextMenuSubTrigger,
		ContextMenuSubContent,
	} from "$lib/fancy-ui/context-menu";

	const { Story } = defineMeta({
		title: "Core/ContextMenu",
		component: ContextMenu,
		tags: ["autodocs"],
		args: {
			side: "bottom",
			align: "start",
			offset: 2,
			loop: true,
		},
		argTypes: {
			side: {
				control: "select",
				options: ["top", "right", "bottom", "left"],
				description: "Side of the pointer to place the menu on",
			},
			align: {
				control: "select",
				options: ["start", "center", "end"],
				description: "Alignment along the pointer's cross axis",
			},
			offset: { control: "number", description: "Gap in pixels between the pointer and the menu" },
			loop: { control: "boolean", description: "Whether arrow-key navigation wraps at the ends" },
		},
	});
</script>

{#snippet region()}
	<div
		class="border-border text-muted-foreground flex h-[160px] w-[320px] items-center justify-center rounded-[10px] border border-dashed text-[13px]"
	>
		Right-click here
	</div>
{/snippet}

{#snippet template(args: any)}
	<ContextMenu {...args}>
		<ContextMenuTrigger>{@render region()}</ContextMenuTrigger>
		<ContextMenuContent>
			<ContextMenuItem>Previous</ContextMenuItem>
			<ContextMenuItem>Next</ContextMenuItem>
			<ContextMenuItem>Reload</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem>Save page…</ContextMenuItem>
		</ContextMenuContent>
	</ContextMenu>
{/snippet}

{#snippet submenuTemplate(args: any)}
	<ContextMenu {...args}>
		<ContextMenuTrigger>{@render region()}</ContextMenuTrigger>
		<ContextMenuContent>
			<ContextMenuItem>Previous</ContextMenuItem>
			<ContextMenuItem>Reload</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuSub>
				<ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					<ContextMenuItem>Screenshot</ContextMenuItem>
					<ContextMenuItem>Inspect</ContextMenuItem>
				</ContextMenuSubContent>
			</ContextMenuSub>
		</ContextMenuContent>
	</ContextMenu>
{/snippet}

{#snippet disabledTemplate(args: any)}
	<ContextMenu {...args}>
		<ContextMenuTrigger>{@render region()}</ContextMenuTrigger>
		<ContextMenuContent>
			<ContextMenuItem>Previous</ContextMenuItem>
			<ContextMenuItem disabled>Next</ContextMenuItem>
			<ContextMenuItem>Reload</ContextMenuItem>
		</ContextMenuContent>
	</ContextMenu>
{/snippet}

<Story name="Default" {template} />

<Story name="With Submenu" template={submenuTemplate} />

<Story name="Disabled Items" template={disabledTemplate} />
