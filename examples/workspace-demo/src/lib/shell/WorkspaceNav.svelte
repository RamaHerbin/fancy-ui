<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem } from "fancy-ui-svelte";
	import { strings } from "$lib/strings.js";
	import { NAV_GROUPS, isCurrent } from "./nav.js";

	let { pathname, class: className }: { pathname: string; class?: string } = $props();
</script>

<Sidebar label={strings.nav.label} class={className}>
	{#each NAV_GROUPS as group (group.label)}
		<SidebarGroup label={group.label}>
			{#each group.entries as entry (entry.id)}
				<SidebarItem href={entry.href} current={isCurrent(entry, pathname)}>
					{#snippet icon()}
						<entry.icon class="size-4" aria-hidden="true" />
					{/snippet}
					{entry.label}
				</SidebarItem>
			{/each}
		</SidebarGroup>
	{/each}
</Sidebar>
