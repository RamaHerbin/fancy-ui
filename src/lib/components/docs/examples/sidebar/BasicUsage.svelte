<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem } from "$lib/fancy-ui/sidebar";

	let current = $state("dashboard");
</script>

<Sidebar>
	<SidebarGroup label="General">
		<SidebarItem
			href="#dashboard"
			current={current === "dashboard"}
			onclick={() => (current = "dashboard")}
		>
			Dashboard
		</SidebarItem>
		<SidebarItem
			href="#projects"
			current={current === "projects"}
			onclick={() => (current = "projects")}
		>
			Projects
		</SidebarItem>
		<SidebarItem
			href="#settings"
			current={current === "settings"}
			onclick={() => (current = "settings")}
		>
			Settings
		</SidebarItem>
	</SidebarGroup>
</Sidebar>
