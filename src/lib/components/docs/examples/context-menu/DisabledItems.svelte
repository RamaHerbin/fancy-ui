<script lang="ts">
	import {
		ContextMenu,
		ContextMenuTrigger,
		ContextMenuContent,
		ContextMenuItem,
	} from "$lib/fancy-ui/context-menu";
</script>

<ContextMenu>
	<ContextMenuTrigger>
		<div
			class="border-border text-muted-foreground flex h-[140px] w-full items-center justify-center rounded-[10px] border border-dashed text-[13px]"
		>
			Right-click here
		</div>
	</ContextMenuTrigger>
	<ContextMenuContent>
		<ContextMenuItem onSelect={() => console.log("back")}>Previous</ContextMenuItem>
		<ContextMenuItem disabled onSelect={() => console.log("forward")}>Next</ContextMenuItem>
		<ContextMenuItem onSelect={() => console.log("reload")}>Reload</ContextMenuItem>
	</ContextMenuContent>
</ContextMenu>
