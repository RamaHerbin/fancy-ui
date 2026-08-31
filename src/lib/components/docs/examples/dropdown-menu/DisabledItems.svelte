<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
	} from "$lib/fancy-ui/dropdown-menu";
</script>

<DropdownMenu sound>
	<DropdownMenuTrigger>Edit</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem onSelect={() => console.log("undo")}>Undo</DropdownMenuItem>
		<DropdownMenuItem disabled onSelect={() => console.log("redo")}>Redo</DropdownMenuItem>
		<DropdownMenuItem onSelect={() => console.log("cut")}>Cut</DropdownMenuItem>
		<DropdownMenuItem disabled onSelect={() => console.log("paste")}>Paste</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
