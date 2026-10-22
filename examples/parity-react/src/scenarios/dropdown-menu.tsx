// Mirrors src/lib/components/docs/examples/dropdown-menu/BasicUsage.svelte.
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "fancy-ui-react";

export default function Scenario() {
	return (
		<DropdownMenu sound>
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
	);
}
