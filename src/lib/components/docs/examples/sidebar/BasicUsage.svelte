<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem } from "$lib/fancy-ui/sidebar";

	let current = $state("dashboard");
</script>

<Sidebar>
	<SidebarGroup label="General">
		<SidebarItem
			sound
			href="#dashboard"
			current={current === "dashboard"}
			onclick={() => (current = "dashboard")}
		>
			Dashboard
		</SidebarItem>
		<SidebarItem
			sound
			href="#projects"
			current={current === "projects"}
			onclick={() => (current = "projects")}
		>
			Projects
		</SidebarItem>
		<SidebarItem
			sound
			href="#settings"
			current={current === "settings"}
			onclick={() => (current = "settings")}
		>
			Settings
		</SidebarItem>
	</SidebarGroup>
</Sidebar>
