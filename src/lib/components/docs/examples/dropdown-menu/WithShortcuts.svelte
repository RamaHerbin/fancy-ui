<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
	} from "$lib/fancy-ui/dropdown-menu";
</script>

<DropdownMenu>
	<DropdownMenuTrigger>File</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem shortcut="⌘R" onSelect={() => console.log("rename")}>Rename</DropdownMenuItem>
		<DropdownMenuItem shortcut="⌘D" onSelect={() => console.log("duplicate")}>
			Duplicate
		</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem shortcut="⌫" onSelect={() => console.log("delete")}>Delete</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
