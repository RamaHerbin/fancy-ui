<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem, SidebarSeparator } from "$lib/fancy-ui/sidebar";
</script>

<Sidebar>
	<SidebarGroup label="General">
		<SidebarItem sound href="#dashboard" current>Dashboard</SidebarItem>
		<SidebarItem sound href="#projects">Projects</SidebarItem>
		<SidebarItem sound href="#inbox" badge={4} badgeLabel="unread">Inbox</SidebarItem>
		<SidebarItem sound href="#settings">Settings</SidebarItem>
	</SidebarGroup>

	<SidebarSeparator />

	<SidebarGroup label="Danger zone">
		<SidebarItem sound href="#archived" badge="12">Archived</SidebarItem>
	</SidebarGroup>
</Sidebar>
