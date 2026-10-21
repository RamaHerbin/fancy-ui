<!-- Test-only rig: a navigation trigger carrying a consumer attribute bag. -->
<script lang="ts">
	import NavigationMenu from "./NavigationMenu.svelte";
	import NavigationMenuList from "./NavigationMenuList.svelte";
	import NavigationMenuItem from "./NavigationMenuItem.svelte";
	import NavigationMenuTrigger from "./NavigationMenuTrigger.svelte";
	import NavigationMenuContent from "./NavigationMenuContent.svelte";

	let { attrs = {} }: { attrs?: Record<string, unknown> } = $props();
</script>

<NavigationMenu label="Test navigation">
	<NavigationMenuList>
		<NavigationMenuItem value="products">
			<NavigationMenuTrigger {...attrs}>Products</NavigationMenuTrigger>
			<NavigationMenuContent>Panel</NavigationMenuContent>
		</NavigationMenuItem>
		<NavigationMenuItem value="company">
			<NavigationMenuTrigger>Company</NavigationMenuTrigger>
			<NavigationMenuContent>Panel</NavigationMenuContent>
		</NavigationMenuItem>
	</NavigationMenuList>
</NavigationMenu>
