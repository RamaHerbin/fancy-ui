import { useState } from "react";
import { Button, Sheet, Switch } from "fancy-ui-react";

export function SheetExample() {
	const [open, setOpen] = useState(false);
	const [notifications, setNotifications] = useState(true);
	const [compactMode, setCompactMode] = useState(false);

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open settings</Button>

			<Sheet
				sound
				open={open}
				onOpenChange={setOpen}
				title="Settings"
				description="Update your workspace preferences."
			>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-[13px]">Notifications</span>
					<Switch
						sound
						checked={notifications}
						onCheckedChange={setNotifications}
						label="Notifications"
					/>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-[13px]">Compact mode</span>
					<Switch
						sound
						checked={compactMode}
						onCheckedChange={setCompactMode}
						label="Compact mode"
					/>
				</div>
			</Sheet>
		</>
	);
}
