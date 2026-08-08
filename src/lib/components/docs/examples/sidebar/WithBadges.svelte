<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem, SidebarSeparator } from "$lib/fancy-ui/sidebar";
</script>

<Sidebar>
	<SidebarGroup label="General">
		<SidebarItem href="#dashboard" current>Dashboard</SidebarItem>
		<SidebarItem href="#projects">Projects</SidebarItem>
		<SidebarItem href="#inbox" badge={4} badgeLabel="unread">Inbox</SidebarItem>
		<SidebarItem href="#settings">Settings</SidebarItem>
	</SidebarGroup>

	<SidebarSeparator />

	<SidebarGroup label="Danger zone">
		<SidebarItem href="#archived" badge="12">Archived</SidebarItem>
	</SidebarGroup>
</Sidebar>
