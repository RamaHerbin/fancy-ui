<script lang="ts">
	import {
		NavigationMenu,
		NavigationMenuList,
		NavigationMenuItem,
		NavigationMenuTrigger,
		NavigationMenuContent,
		NavigationMenuLink,
	} from "$lib/fancy-ui/navigation-menu";
</script>

<!--
	A panel doesn't have to be the mockup's two-column feature layout — it's a
	plain snippet, so a single trigger opening a plain, single-column stack of
	links is just as valid. Override the grid with `class` on
	NavigationMenuContent.
-->
<NavigationMenu label="Company">
	<NavigationMenuList>
		<NavigationMenuItem value="company">
			<NavigationMenuTrigger>Company</NavigationMenuTrigger>
			<NavigationMenuContent class="w-56 grid-cols-1">
				<NavigationMenuLink href="#about" title="About" description="Our story and team" />
				<NavigationMenuLink href="#careers" title="Careers" description="Open positions" />
				<NavigationMenuLink href="#blog" title="Blog" description="Product updates and notes" />
			</NavigationMenuContent>
		</NavigationMenuItem>
	</NavigationMenuList>
</NavigationMenu>
