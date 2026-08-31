<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem, SidebarFooter } from "$lib/fancy-ui/sidebar";
</script>

<Sidebar>
	<SidebarGroup label="General">
		<SidebarItem sound href="#dashboard" current>Dashboard</SidebarItem>
		<SidebarItem sound href="#projects">Projects</SidebarItem>
		<SidebarItem sound href="#settings">Settings</SidebarItem>
	</SidebarGroup>

	<SidebarFooter>
		{#snippet avatar()}
			<span
				class="inline-block h-[22px] w-[22px] rounded-full bg-gradient-to-br from-purple-500 to-cyan-400"
			></span>
		{/snippet}
		Rama H.
	</SidebarFooter>
</Sidebar>
