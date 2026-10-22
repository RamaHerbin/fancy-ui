// Mirrors src/lib/components/docs/examples/navigation-menu/BasicUsage.svelte.
import {
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuTrigger,
	NavigationMenuContent,
	NavigationMenuLink,
} from "fancy-ui-react";

export default function Scenario() {
	return (
		<NavigationMenu label="Product">
			<NavigationMenuList>
				<NavigationMenuItem value="products">
					<NavigationMenuTrigger>Products</NavigationMenuTrigger>
					<NavigationMenuContent>
						<NavigationMenuLink href="#components" className="ft-navigation-menu-feature">
							<div className="flex items-center gap-1.5 text-[13px] font-semibold">
								<svg
									className="size-3.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<path d="m12 3 1.9 4.8L19 9l-4.8 1.9L12 16l-1.9-4.8L5 9l4.8-1.9L12 3Z" />
								</svg>
								Components
							</div>
							<span className="text-muted-foreground text-[11px]">Browse the full UI library</span>
						</NavigationMenuLink>
						<div className="flex flex-col gap-0.5">
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
						<NavigationMenuLink href="#docs" className="ft-navigation-menu-feature">
							<div className="flex items-center gap-1.5 text-[13px] font-semibold">
								<svg
									className="size-3.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
									<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
								</svg>
								Documentation
							</div>
							<span className="text-muted-foreground text-[11px]">Guides and API reference</span>
						</NavigationMenuLink>
						<div className="flex flex-col gap-0.5">
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

				{/* A plain link that isn't a disclosure — it has no panel — sits in the same row, wrapped in its own <li> like every NavigationMenuItem already is. */}
				<li>
					<a
						href="#pricing"
						className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium no-underline transition-colors"
					>
						Pricing
					</a>
				</li>
			</NavigationMenuList>
		</NavigationMenu>
	);
}
