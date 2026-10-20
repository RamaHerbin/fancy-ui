// Mirrors src/lib/components/docs/examples/switch/BasicUsage.svelte.
import { useState } from "react";
import { Switch } from "fancy-ui-react";

export default function Scenario() {
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
