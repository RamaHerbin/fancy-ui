import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const DEFAULTS: Record<string, PlaygroundScalar> = {
	label: "Main",
	openDelay: 150,
	closeDelay: 200,
};

/**
 * The usage per framework: a menu is a list of items, each a trigger and a
 * panel of links, so the export carries two items. The compound parts share
 * their names and props in all three frameworks; only the panel's class
 * prop differs.
 */
export function navigationMenuCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const [name, fallback] of Object.entries(DEFAULTS)) {
		const value = values[name];
		if (value !== undefined && value !== fallback) attrs.push(attribute(name, value, framework));
	}
	const props = attrs.map((a) => `\n\t${a}`).join("");
	const close = props ? "\n>" : ">";
	const cls = framework === "react" ? "className" : "class";
	return `<NavigationMenu${props}${close}
	<NavigationMenuList>
		<NavigationMenuItem value="products">
			<NavigationMenuTrigger>Products</NavigationMenuTrigger>
			<NavigationMenuContent ${cls}="w-56 grid-cols-1">
				<NavigationMenuLink
					href="#components"
					title="Components"
					description="Browse the full library"
				/>
				<NavigationMenuLink
					href="#themes"
					title="Themes"
					description="Generate colour palettes"
				/>
			</NavigationMenuContent>
		</NavigationMenuItem>
		<NavigationMenuItem value="resources">
			<NavigationMenuTrigger>Resources</NavigationMenuTrigger>
			<NavigationMenuContent ${cls}="w-56 grid-cols-1">
				<NavigationMenuLink
					href="#docs"
					title="Docs"
					description="Guides and API reference"
				/>
				<NavigationMenuLink
					href="#changelog"
					title="Changelog"
					description="What shipped recently"
				/>
			</NavigationMenuContent>
		</NavigationMenuItem>
	</NavigationMenuList>
</NavigationMenu>`;
}
