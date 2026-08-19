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
	<DropdownMenuTrigger>Project</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem onSelect={() => console.log("archive")}>Archive</DropdownMenuItem>
		<DropdownMenuItem onSelect={() => console.log("leave")}>Leave project</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem
			variant="destructive"
			shortcut="⌫"
			onSelect={() => console.log("delete project")}
		>
			Delete project
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
