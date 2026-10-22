// Mirrors src/lib/components/docs/examples/command-menu/BasicUsage.svelte.
import { useState } from "react";
import { Button, CommandMenu } from "fancy-ui-react";
import type { CommandItem } from "fancy-ui-react";

const items: CommandItem[] = [
	{ id: "button", label: "Button", meta: "Actions" },
	{ id: "icon-button", label: "Icon Button", meta: "Actions" },
	{ id: "rainbow-button", label: "Rainbow Button", meta: "Buttons" },
	{ id: "settings", label: "Settings" },
];

export default function Scenario() {
	const [open, setOpen] = useState(false);
	const [picked, setPicked] = useState("");

	return (
		<>
			<div className="flex flex-col items-start gap-3">
				<Button onClick={() => setOpen(true)}>Open command menu</Button>
				{picked && <p className="text-muted-foreground text-[12px]">Last picked: {picked}</p>}
			</div>

			<CommandMenu
				sound
				open={open}
				onOpenChange={setOpen}
				items={items}
				onSelect={(item) => setPicked(item.label)}
			/>
		</>
	);
}
