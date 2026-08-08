<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuSub,
		DropdownMenuSubTrigger,
		DropdownMenuSubContent,
	} from "$lib/fancy-ui/dropdown-menu";
</script>

<DropdownMenu>
	<DropdownMenuTrigger>Actions</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem onSelect={() => console.log("reload")}>Reload</DropdownMenuItem>
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>More tools</DropdownMenuSubTrigger>
			<DropdownMenuSubContent>
				<DropdownMenuItem onSelect={() => console.log("screenshot")}>Screenshot</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => console.log("inspect")}>Inspect</DropdownMenuItem>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
		<DropdownMenuSeparator />
		<DropdownMenuItem onSelect={() => console.log("save")}>Save page…</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
