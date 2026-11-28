// Mirrors src/lib/components/docs/examples/context-menu/BasicUsage.svelte.
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "fancy-ui-react";

export default function Scenario() {
	return (
		<ContextMenu sound>
			<ContextMenuTrigger focusable>
				<div className="border-border text-muted-foreground flex h-[140px] w-full items-center justify-center rounded-[10px] border border-dashed text-[13px]">
					Right-click here
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={() => console.log("back")}>Previous</ContextMenuItem>
				<ContextMenuItem onSelect={() => console.log("forward")}>Next</ContextMenuItem>
				<ContextMenuItem onSelect={() => console.log("reload")}>Reload</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onSelect={() => console.log("save")}>Save page…</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
