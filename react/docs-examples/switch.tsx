import { useState } from "react";
import { Switch } from "fancy-ui-react";

export function SwitchExample() {
	const [notifications, setNotifications] = useState(false);

	return (
		<Switch
			sound
			checked={notifications}
			onCheckedChange={setNotifications}
			label="Notifications"
		/>
	);
}
