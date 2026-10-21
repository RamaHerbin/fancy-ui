<script setup lang="ts">
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "fancy-ui-vue";
</script>

<template>
	<NavigationMenu label="Product">
		<NavigationMenuList>
			<NavigationMenuItem value="products">
				<NavigationMenuTrigger>Products</NavigationMenuTrigger>
				<NavigationMenuContent>
					<NavigationMenuLink href="#components" class="ft-navigation-menu-feature">
						<div class="text-[13px] font-semibold">Components</div>
						<span class="text-muted-foreground text-[11px]">Browse the full UI library</span>
					</NavigationMenuLink>
					<div class="flex flex-col gap-0.5">
						<NavigationMenuLink
							href="#themes"
							title="Themes"
							description="Generate custom color palettes"
						/>
						<NavigationMenuLink
							href="#templates"
							title="Templates"
							description="Ready-to-use page starters"
						/>
					</div>
				</NavigationMenuContent>
			</NavigationMenuItem>

			<NavigationMenuItem value="resources">
				<NavigationMenuTrigger>Resources</NavigationMenuTrigger>
				<NavigationMenuContent>
					<NavigationMenuLink href="#docs" class="ft-navigation-menu-feature">
						<div class="text-[13px] font-semibold">Documentation</div>
						<span class="text-muted-foreground text-[11px]">Guides and API reference</span>
					</NavigationMenuLink>
					<div class="flex flex-col gap-0.5">
						<NavigationMenuLink
							href="#changelog"
							title="Changelog"
							description="What shipped recently"
						/>
						<NavigationMenuLink
							href="#support"
							title="Support"
							description="Get help from the community"
						/>
					</div>
				</NavigationMenuContent>
			</NavigationMenuItem>

			<li>
				<a
					href="#pricing"
					class="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium no-underline transition-colors"
				>
					Pricing
				</a>
			</li>
		</NavigationMenuList>
	</NavigationMenu>
</template>
