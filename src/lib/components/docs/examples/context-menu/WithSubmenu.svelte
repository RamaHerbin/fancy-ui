<script lang="ts">
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
</script>

<ContextMenu sound>
	<ContextMenuTrigger>
		<div
			class="border-border text-muted-foreground flex h-[140px] w-full items-center justify-center rounded-[10px] border border-dashed text-[13px]"
		>
			Right-click here
		</div>
	</ContextMenuTrigger>
	<ContextMenuContent>
		<ContextMenuItem onSelect={() => console.log("back")}>Previous</ContextMenuItem>
		<ContextMenuItem onSelect={() => console.log("reload")}>Reload</ContextMenuItem>
		<ContextMenuSeparator />
		<ContextMenuSub>
			<ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<ContextMenuItem onSelect={() => console.log("screenshot")}>Screenshot</ContextMenuItem>
				<ContextMenuItem onSelect={() => console.log("inspect")}>Inspect</ContextMenuItem>
			</ContextMenuSubContent>
		</ContextMenuSub>
	</ContextMenuContent>
</ContextMenu>
