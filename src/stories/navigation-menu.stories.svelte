<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import {
		NavigationMenu,
		NavigationMenuList,
		NavigationMenuItem,
		NavigationMenuTrigger,
		NavigationMenuContent,
		NavigationMenuLink,
	} from "$lib/fancy-ui/navigation-menu";

	const { Story } = defineMeta({
		title: "Navigation/NavigationMenu",
		component: NavigationMenu,
		tags: ["autodocs"],
		args: {
			label: "Product",
			openDelay: 150,
			closeDelay: 200,
		},
		argTypes: {
			value: { control: "text", description: 'The open item\'s value, `""` when closed' },
			label: { control: "text", description: "Accessible name for the <nav> landmark" },
			openDelay: {
				control: "number",
				description: "Delay in ms before a hovered trigger opens its panel",
			},
			closeDelay: {
				control: "number",
				description: "Delay in ms before a panel closes after the pointer leaves it",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<NavigationMenu {...args}>
		<NavigationMenuList>
			<NavigationMenuItem value="products">
				<NavigationMenuTrigger>Products</NavigationMenuTrigger>
				<NavigationMenuContent>
					<NavigationMenuLink href="#components" class="ft-navigation-menu-feature">
						<span class="text-[13px] font-semibold">Components</span>
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
						<span class="text-[13px] font-semibold">Documentation</span>
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
{/snippet}

{#snippet simpleTemplate(args: any)}
	<NavigationMenu {...args}>
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
{/snippet}

<Story name="Default" {template} />

<Story name="Simple links, single column" template={simpleTemplate} args={{ label: "Company" }} />

<Story name="Long delays" {template} args={{ openDelay: 500, closeDelay: 500 }} />
