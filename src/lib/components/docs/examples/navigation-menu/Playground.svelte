<script lang="ts">
	import {
		NavigationMenu,
		NavigationMenuList,
		NavigationMenuItem,
		NavigationMenuTrigger,
		NavigationMenuContent,
		NavigationMenuLink,
	} from "$lib/fancy-ui/navigation-menu";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { navigationMenuCode } from "./code.js";
</script>

<PropsPlayground
	component="NavigationMenu"
	slug="navigation-menu"
	importNames={{
		svelte: [
			"NavigationMenu",
			"NavigationMenuList",
			"NavigationMenuItem",
			"NavigationMenuTrigger",
			"NavigationMenuContent",
			"NavigationMenuLink",
		],
		react: [
			"NavigationMenu",
			"NavigationMenuList",
			"NavigationMenuItem",
			"NavigationMenuTrigger",
			"NavigationMenuContent",
			"NavigationMenuLink",
		],
		vue: [
			"NavigationMenu",
			"NavigationMenuList",
			"NavigationMenuItem",
			"NavigationMenuTrigger",
			"NavigationMenuContent",
			"NavigationMenuLink",
		],
	}}
	codeFor={navigationMenuCode}
	controls={[
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "openDelay", type: "range", label: "Open delay (ms)", min: 0, max: 800, step: 10 },
		{ key: "closeDelay", type: "range", label: "Close delay (ms)", min: 0, max: 800, step: 10 },
	]}
	initialValues={{ label: "Main", openDelay: 150, closeDelay: 200 }}
>
	{#snippet preview(values)}
		<div
			class="relative flex h-40 w-[28rem] max-w-[85vw] items-start justify-center overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-6 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<NavigationMenu
				label={values.label as string}
				openDelay={values.openDelay as number}
				closeDelay={values.closeDelay as number}
			>
				<NavigationMenuList>
					<NavigationMenuItem value="products">
						<NavigationMenuTrigger>Products</NavigationMenuTrigger>
						<NavigationMenuContent class="w-56 grid-cols-1">
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
						<NavigationMenuContent class="w-56 grid-cols-1">
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
			</NavigationMenu>
		</div>
	{/snippet}
</PropsPlayground>
