// Mirrors src/lib/components/docs/examples/sidebar/BasicUsage.svelte.
import { useState } from "react";
import { Sidebar, SidebarGroup, SidebarItem } from "fancy-ui-react";

export default function Scenario() {
	const [current, setCurrent] = useState("dashboard");

	return (
		<Sidebar>
			<SidebarGroup label="General">
				<SidebarItem
					sound
					href="#dashboard"
					current={current === "dashboard"}
					onClick={() => setCurrent("dashboard")}
				>
					Dashboard
				</SidebarItem>
				<SidebarItem
					sound
					href="#projects"
					current={current === "projects"}
					onClick={() => setCurrent("projects")}
				>
					Projects
				</SidebarItem>
				<SidebarItem
					sound
					href="#settings"
					current={current === "settings"}
					onClick={() => setCurrent("settings")}
				>
					Settings
				</SidebarItem>
			</SidebarGroup>
		</Sidebar>
	);
}
