<!--
  Test-only rig. `collapsed` is a plain prop on `Sidebar` — there is nothing
  to bind, since nothing inside the compound ever changes it itself. This
  rig keeps its own local, bindable `collapsed` (so an outer test can flip it
  the way a real consumer-owned trigger would) and forwards it into `Sidebar`
  as an ordinary prop, then echoes it into the DOM so a test can observe the
  round trip through the harness's own binding, not Sidebar's. Also proves
  the context-propagation behaviour (group headings and item labels/badges
  moving to sr-only) reacts correctly to an externally-driven prop change.
  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import Sidebar from "./Sidebar.svelte";
	import SidebarGroup from "./SidebarGroup.svelte";
	import SidebarItem from "./SidebarItem.svelte";

	interface Props {
		collapsed?: boolean;
	}

	let { collapsed = $bindable(false) }: Props = $props();

	let navRef = $state<HTMLElement | null>(null);
	$effect(() => {
		navRef?.setAttribute("data-bound-ref", "yes");
	});
</script>

<button type="button" data-testid="toggle" onclick={() => (collapsed = !collapsed)}>
	Toggle
</button>

<Sidebar {collapsed} bind:ref={navRef}>
	<SidebarGroup label="General">
		<SidebarItem href="/dashboard" current badge={4} badgeLabel="unread">Dashboard</SidebarItem>
		<SidebarItem>Projects</SidebarItem>
	</SidebarGroup>
</Sidebar>

<span data-testid="bound-collapsed">{collapsed}</span>
