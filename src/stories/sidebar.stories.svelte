<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Sidebar, SidebarGroup, SidebarItem, SidebarFooter } from "$lib/fancy-ui/sidebar";

	const { Story } = defineMeta({
		title: "Navigation/Sidebar",
		component: Sidebar,
		tags: ["autodocs"],
		args: {
			label: "Sidebar",
			collapsed: false,
		},
		argTypes: {
			label: { control: "text", description: "Accessible name for the nav landmark" },
			collapsed: {
				control: "boolean",
				description: "Whether the sidebar is collapsed to an icon-only rail",
			},
		},
	});
</script>

<!--
	Every item below gets an `icon` — not just decoration. A collapsed
	SidebarItem with no icon renders as a blank row (its label/badge are
	still in the accessibility tree via sr-only text, but there is nothing
	for a sighted user to see or click on with intent). The "Collapsed"
	story exists specifically to demonstrate the icon-only rail, so it has
	to give every item something to show — see the README's "Icons and the
	collapsed state" note for the constraint this documents.
-->
{#snippet dashboardIcon()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<rect x="3" y="3" width="7" height="9" rx="1" />
		<rect x="14" y="3" width="7" height="5" rx="1" />
		<rect x="14" y="12" width="7" height="9" rx="1" />
		<rect x="3" y="16" width="7" height="5" rx="1" />
	</svg>
{/snippet}

{#snippet projectsIcon()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<line x1="8" y1="6" x2="21" y2="6" />
		<line x1="8" y1="12" x2="21" y2="12" />
		<line x1="8" y1="18" x2="21" y2="18" />
		<line x1="3" y1="6" x2="3.01" y2="6" />
		<line x1="3" y1="12" x2="3.01" y2="12" />
		<line x1="3" y1="18" x2="3.01" y2="18" />
	</svg>
{/snippet}

{#snippet inboxIcon()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M22 12h-6l-2 3h-4l-2-3H2" />
		<path
			d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"
		/>
	</svg>
{/snippet}

{#snippet settingsIcon()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<circle cx="12" cy="12" r="3" />
		<path
			d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
		/>
	</svg>
{/snippet}

{#snippet template(args: any)}
	<Sidebar {...args}>
		<SidebarGroup label="General">
			<SidebarItem href="#dashboard" current icon={dashboardIcon}>Dashboard</SidebarItem>
			<SidebarItem href="#projects" icon={projectsIcon}>Projects</SidebarItem>
			<SidebarItem href="#inbox" badge={4} badgeLabel="unread" icon={inboxIcon}>Inbox</SidebarItem>
			<SidebarItem href="#settings" icon={settingsIcon}>Settings</SidebarItem>
		</SidebarGroup>
	</Sidebar>
{/snippet}

{#snippet withFooterTemplate(args: any)}
	<Sidebar {...args}>
		<SidebarGroup label="General">
			<SidebarItem href="#dashboard" current icon={dashboardIcon}>Dashboard</SidebarItem>
			<SidebarItem href="#projects" icon={projectsIcon}>Projects</SidebarItem>
			<SidebarItem href="#settings" icon={settingsIcon}>Settings</SidebarItem>
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
{/snippet}

<Story name="Default" {template} />

<Story name="Collapsed" {template} args={{ collapsed: true }} />

<Story name="With Footer" template={withFooterTemplate} />
