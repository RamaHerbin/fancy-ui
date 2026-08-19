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
	<DropdownMenuTrigger>Options</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem onSelect={() => console.log("rename")}>Rename</DropdownMenuItem>
		<DropdownMenuItem onSelect={() => console.log("duplicate")}>Duplicate</DropdownMenuItem>
		<DropdownMenuItem onSelect={() => console.log("share")}>Share…</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem variant="destructive" onSelect={() => console.log("delete")}>
			Delete
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
