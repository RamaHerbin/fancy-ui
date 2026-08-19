<script lang="ts">
	import {
		NavigationMenu,
		NavigationMenuList,
		NavigationMenuItem,
		NavigationMenuTrigger,
		NavigationMenuContent,
		NavigationMenuLink,
	} from "$lib/fancy-ui/navigation-menu";

	// In a real app this would come from the current route, not a fixed value —
	// `current` never infers "the current page" from the URL for you.
	const currentPath: string = "#themes";
</script>

<NavigationMenu label="Product">
	<NavigationMenuList>
		<NavigationMenuItem value="products">
			<NavigationMenuTrigger>Products</NavigationMenuTrigger>
			<NavigationMenuContent class="w-56 grid-cols-1">
				<NavigationMenuLink
					href="#components"
					title="Components"
					description="Browse the full UI library"
					current={currentPath === "#components"}
				/>
				<NavigationMenuLink
					href="#themes"
					title="Themes"
					description="Generate custom color palettes"
					current={currentPath === "#themes"}
				/>
				<NavigationMenuLink
					href="#templates"
					title="Templates"
					description="Ready-to-use page starters"
					current={currentPath === "#templates"}
				/>
			</NavigationMenuContent>
		</NavigationMenuItem>
	</NavigationMenuList>
</NavigationMenu>
