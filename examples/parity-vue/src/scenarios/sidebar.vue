<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/sidebar/BasicUsage.svelte.
import { ref } from "vue";
import { Sidebar, SidebarGroup, SidebarItem } from "fancy-ui-vue";

const current = ref("dashboard");
</script>

<template>
	<Sidebar>
		<SidebarGroup label="General">
			<SidebarItem
				sound
				href="#dashboard"
				:current="current === 'dashboard'"
				@click="current = 'dashboard'"
			>
				Dashboard
			</SidebarItem>
			<SidebarItem
				sound
				href="#projects"
				:current="current === 'projects'"
				@click="current = 'projects'"
			>
				Projects
			</SidebarItem>
			<SidebarItem
				sound
				href="#settings"
				:current="current === 'settings'"
				@click="current = 'settings'"
			>
				Settings
			</SidebarItem>
		</SidebarGroup>
	</Sidebar>
</template>
